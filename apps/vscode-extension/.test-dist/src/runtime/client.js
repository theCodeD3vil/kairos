"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketDesktopClient = void 0;
const node_buffer_1 = require("node:buffer");
const node_crypto_1 = __importDefault(require("node:crypto"));
const constants_1 = require("./constants");
const discovery_1 = require("./discovery");
const WS_REQUEST_TYPE_HANDSHAKE = 'handshake.request';
const WS_REQUEST_TYPE_INGEST = 'ingest.request';
const WS_RESPONSE_TYPE_HANDSHAKE = 'handshake.response';
const WS_RESPONSE_TYPE_INGEST = 'ingest.response';
const WS_RESPONSE_TYPE_ERROR = 'error';
const WS_ENDPOINT_PATH = '/v1/extension/ws';
const WS_SUBPROTOCOL = 'kairos.v2';
const WS_AUTH_SUBPROTOCOL_PREFIX = 'kairos.auth.';
const WEBSOCKET_STATE_CONNECTING = 0;
const WEBSOCKET_STATE_OPEN = 1;
class WebSocketDesktopClient {
    preferredBaseURL;
    requestTimeoutMs;
    webSocketFactory;
    idFactory;
    activeEndpoint;
    activeSocket;
    activeListeners;
    connectPromise;
    pending = new Map();
    constructor(preferredBaseURL, options) {
        this.preferredBaseURL = preferredBaseURL;
        this.requestTimeoutMs = options?.requestTimeoutMs ?? constants_1.DESKTOP_REQUEST_TIMEOUT_MS;
        this.webSocketFactory = options?.webSocketFactory ?? createDefaultWebSocketFactory();
        this.idFactory = options?.idFactory ?? (() => node_crypto_1.default.randomUUID());
    }
    async handshake(request) {
        return this.sendRequest(WS_REQUEST_TYPE_HANDSHAKE, WS_RESPONSE_TYPE_HANDSHAKE, request);
    }
    async ingestEvents(request) {
        return this.sendRequest(WS_REQUEST_TYPE_INGEST, WS_RESPONSE_TYPE_INGEST, request);
    }
    async sendRequest(requestType, expectedResponseType, payload) {
        const socket = await this.ensureConnected();
        const requestID = this.idFactory();
        const envelope = {
            id: requestID,
            protocolVersion: constants_1.DESKTOP_PROTOCOL_VERSION,
            type: requestType,
            payload,
        };
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.resetConnection(new Error(`desktop websocket request timed out (${requestType})`), true);
            }, this.requestTimeoutMs);
            this.pending.set(requestID, {
                expectedResponseType,
                resolve: (value) => resolve(value),
                reject,
                timeout,
            });
            try {
                socket.send(JSON.stringify(envelope));
            }
            catch (error) {
                this.rejectPendingRequest(requestID, formatError(error));
                this.resetConnection(new Error(`desktop websocket send failed: ${formatError(error)}`), true);
            }
        });
    }
    async ensureConnected() {
        if (this.activeSocket && this.activeSocket.readyState === WEBSOCKET_STATE_OPEN) {
            return this.activeSocket;
        }
        if (this.connectPromise) {
            return this.connectPromise;
        }
        this.connectPromise = this.openConnection().finally(() => {
            this.connectPromise = undefined;
        });
        return this.connectPromise;
    }
    async openConnection() {
        let lastError;
        for (const candidate of this.resolveCandidates()) {
            try {
                const socket = await this.connectCandidate(candidate);
                this.bindSocket(socket, candidate.endpoint);
                return socket;
            }
            catch (error) {
                lastError = new Error('desktop websocket unavailable');
            }
        }
        throw lastError ?? new Error('desktop websocket unavailable');
    }
    resolveCandidates() {
        const candidates = (0, discovery_1.buildDesktopEndpointCandidates)(this.preferredBaseURL)
            .map((candidate) => ({
            endpoint: toWebSocketEndpoint(candidate.baseURL),
            token: candidate.token,
        }))
            .filter((candidate) => candidate.endpoint !== '');
        return dedupeCandidates(candidates);
    }
    connectCandidate(candidate) {
        return new Promise((resolve, reject) => {
            const protocols = buildWebSocketProtocols(candidate.token);
            const socket = this.webSocketFactory(candidate.endpoint, protocols);
            let settled = false;
            const timeout = setTimeout(() => {
                cleanup();
                safeCloseSocket(socket);
                reject(new Error('desktop websocket connect timed out'));
            }, this.requestTimeoutMs);
            const onOpen = () => {
                if (settled) {
                    return;
                }
                settled = true;
                cleanup();
                resolve(socket);
            };
            const onError = () => {
                if (settled) {
                    return;
                }
                settled = true;
                cleanup();
                reject(new Error('desktop websocket connect failed'));
            };
            const onClose = () => {
                if (settled) {
                    return;
                }
                settled = true;
                cleanup();
                reject(new Error('desktop websocket closed during connect'));
            };
            const cleanup = () => {
                clearTimeout(timeout);
                socket.removeEventListener('open', onOpen);
                socket.removeEventListener('error', onError);
                socket.removeEventListener('close', onClose);
            };
            socket.addEventListener('open', onOpen);
            socket.addEventListener('error', onError);
            socket.addEventListener('close', onClose);
        });
    }
    bindSocket(socket, endpoint) {
        const listeners = {
            close: () => {
                this.resetConnection(new Error('desktop websocket closed'), false);
            },
            error: () => {
                this.resetConnection(new Error('desktop websocket error'), false);
            },
            message: (event) => {
                void this.handleSocketMessage(event);
            },
        };
        socket.addEventListener('close', listeners.close);
        socket.addEventListener('error', listeners.error);
        socket.addEventListener('message', listeners.message);
        this.activeSocket = socket;
        this.activeListeners = listeners;
        this.activeEndpoint = endpoint;
    }
    async handleSocketMessage(event) {
        let text;
        try {
            text = await decodeWebSocketMessageData(event.data);
        }
        catch (error) {
            this.resetConnection(new Error(`desktop websocket message decode failed: ${formatError(error)}`), true);
            return;
        }
        let envelope;
        try {
            envelope = JSON.parse(text);
        }
        catch {
            this.resetConnection(new Error('desktop websocket returned malformed JSON'), true);
            return;
        }
        const requestID = envelope.id?.trim();
        if (!requestID) {
            return;
        }
        const pending = this.pending.get(requestID);
        if (!pending) {
            return;
        }
        this.pending.delete(requestID);
        clearTimeout(pending.timeout);
        if (envelope.type === WS_RESPONSE_TYPE_ERROR || envelope.error) {
            const message = envelope.error?.message?.trim() || 'desktop websocket request failed';
            pending.reject(new Error(message));
            return;
        }
        if (envelope.type !== pending.expectedResponseType) {
            pending.reject(new Error(`desktop websocket response type mismatch: expected ${pending.expectedResponseType}, got ${String(envelope.type)}`));
            return;
        }
        pending.resolve(envelope.payload);
    }
    rejectPendingRequest(requestID, message) {
        const pending = this.pending.get(requestID);
        if (!pending) {
            return;
        }
        this.pending.delete(requestID);
        clearTimeout(pending.timeout);
        pending.reject(new Error(message));
    }
    resetConnection(reason, closeSocket) {
        const socket = this.activeSocket;
        const listeners = this.activeListeners;
        this.activeSocket = undefined;
        this.activeListeners = undefined;
        this.activeEndpoint = undefined;
        if (socket && listeners) {
            socket.removeEventListener('close', listeners.close);
            socket.removeEventListener('error', listeners.error);
            socket.removeEventListener('message', listeners.message);
        }
        if (socket && closeSocket && (socket.readyState === WEBSOCKET_STATE_OPEN || socket.readyState === WEBSOCKET_STATE_CONNECTING)) {
            safeCloseSocket(socket);
        }
        const pendingRequests = Array.from(this.pending.values());
        this.pending.clear();
        for (const pending of pendingRequests) {
            clearTimeout(pending.timeout);
            pending.reject(reason);
        }
    }
}
exports.WebSocketDesktopClient = WebSocketDesktopClient;
function dedupeCandidates(values) {
    const unique = new Map();
    for (const value of values) {
        const key = `${value.endpoint}::${value.token ?? ''}`;
        if (!unique.has(key)) {
            unique.set(key, value);
        }
    }
    return Array.from(unique.values());
}
function toWebSocketEndpoint(baseURL) {
    try {
        const parsed = new URL(baseURL);
        parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
        parsed.pathname = WS_ENDPOINT_PATH;
        parsed.search = '';
        parsed.hash = '';
        return parsed.toString();
    }
    catch {
        return '';
    }
}
function buildWebSocketProtocols(token) {
    if (!token) {
        return [WS_SUBPROTOCOL];
    }
    const encodedToken = node_buffer_1.Buffer.from(token, 'utf8').toString('base64url');
    return [WS_SUBPROTOCOL, `${WS_AUTH_SUBPROTOCOL_PREFIX}${encodedToken}`];
}
function createDefaultWebSocketFactory() {
    const ctor = globalThis.WebSocket;
    if (!ctor) {
        throw new Error('WebSocket is unavailable in this runtime');
    }
    return (url, protocols) => new ctor(url, protocols);
}
function safeCloseSocket(socket) {
    try {
        socket.close();
    }
    catch {
        // Ignore close failures.
    }
}
function formatError(error) {
    if (error instanceof Error && error.message) {
        return error.message;
    }
    return String(error);
}
async function decodeWebSocketMessageData(data) {
    if (typeof data === 'string') {
        return data;
    }
    if (data instanceof ArrayBuffer) {
        return node_buffer_1.Buffer.from(data).toString('utf8');
    }
    if (node_buffer_1.Buffer.isBuffer(data)) {
        return data.toString('utf8');
    }
    if (hasTextMethod(data)) {
        return data.text();
    }
    throw new Error(`unsupported websocket message payload type: ${typeof data}`);
}
function hasTextMethod(value) {
    if (!value || typeof value !== 'object') {
        return false;
    }
    return typeof value.text === 'function';
}
//# sourceMappingURL=client.js.map