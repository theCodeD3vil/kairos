import { Buffer } from 'node:buffer';
import crypto from 'node:crypto';

import type {
  IngestEventsRequest,
  IngestEventsResponse,
} from '@kairos/shared/ingestion';
import type { ExtensionHandshakeRequest, ExtensionHandshakeResponse } from '@kairos/shared/settings';

import { DESKTOP_PROTOCOL_VERSION, DESKTOP_REQUEST_TIMEOUT_MS } from './constants';
import { buildDesktopEndpointCandidates } from './discovery';
import type { DesktopClient } from './types';

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

type WebSocketRequestType = typeof WS_REQUEST_TYPE_HANDSHAKE | typeof WS_REQUEST_TYPE_INGEST;
type WebSocketResponseType = typeof WS_RESPONSE_TYPE_HANDSHAKE | typeof WS_RESPONSE_TYPE_INGEST;

type RequestEnvelope = {
  id: string;
  protocolVersion: number;
  type: WebSocketRequestType;
  payload: unknown;
};

type ErrorPayload = {
  code?: string;
  message?: string;
};

type ResponseEnvelope = {
  id?: string;
  type?: string;
  payload?: unknown;
  error?: ErrorPayload;
};

type PendingRequest = {
  expectedResponseType: WebSocketResponseType;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
};

type DesktopWebSocketEvent = {
  data: unknown;
};

type DesktopWebSocketLike = {
  readonly readyState: number;
  send(data: string): void;
  close(code?: number, reason?: string): void;
  addEventListener(type: 'open', listener: () => void): void;
  addEventListener(type: 'close', listener: () => void): void;
  addEventListener(type: 'error', listener: () => void): void;
  addEventListener(type: 'message', listener: (event: DesktopWebSocketEvent) => void): void;
  removeEventListener(type: 'open', listener: () => void): void;
  removeEventListener(type: 'close', listener: () => void): void;
  removeEventListener(type: 'error', listener: () => void): void;
  removeEventListener(type: 'message', listener: (event: DesktopWebSocketEvent) => void): void;
};

type ConnectionListeners = {
  close: () => void;
  error: () => void;
  message: (event: DesktopWebSocketEvent) => void;
};

type ClientOptions = {
  webSocketFactory?: (url: string, protocols: string[]) => DesktopWebSocketLike;
  requestTimeoutMs?: number;
  idFactory?: () => string;
};

export class WebSocketDesktopClient implements DesktopClient {
  private readonly requestTimeoutMs: number;
  private readonly webSocketFactory: (url: string, protocols: string[]) => DesktopWebSocketLike;
  private readonly idFactory: () => string;
  private activeEndpoint?: string;
  private activeSocket?: DesktopWebSocketLike;
  private activeListeners?: ConnectionListeners;
  private connectPromise?: Promise<DesktopWebSocketLike>;
  private readonly pending = new Map<string, PendingRequest>();

  constructor(
    private readonly preferredBaseURL?: string,
    options?: ClientOptions,
  ) {
    this.requestTimeoutMs = options?.requestTimeoutMs ?? DESKTOP_REQUEST_TIMEOUT_MS;
    this.webSocketFactory = options?.webSocketFactory ?? createDefaultWebSocketFactory();
    this.idFactory = options?.idFactory ?? (() => crypto.randomUUID());
  }

  async handshake(request: ExtensionHandshakeRequest): Promise<ExtensionHandshakeResponse> {
    return this.sendRequest<ExtensionHandshakeResponse>(
      WS_REQUEST_TYPE_HANDSHAKE,
      WS_RESPONSE_TYPE_HANDSHAKE,
      request,
    );
  }

  async ingestEvents(request: IngestEventsRequest): Promise<IngestEventsResponse> {
    return this.sendRequest<IngestEventsResponse>(
      WS_REQUEST_TYPE_INGEST,
      WS_RESPONSE_TYPE_INGEST,
      request,
    );
  }

  private async sendRequest<TResponse>(
    requestType: WebSocketRequestType,
    expectedResponseType: WebSocketResponseType,
    payload: unknown,
  ): Promise<TResponse> {
    const socket = await this.ensureConnected();
    const requestID = this.idFactory();
    const envelope: RequestEnvelope = {
      id: requestID,
      protocolVersion: DESKTOP_PROTOCOL_VERSION,
      type: requestType,
      payload,
    };

    return new Promise<TResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.resetConnection(new Error(`desktop websocket request timed out (${requestType})`), true);
      }, this.requestTimeoutMs);

      this.pending.set(requestID, {
        expectedResponseType,
        resolve: (value) => resolve(value as TResponse),
        reject,
        timeout,
      });

      try {
        socket.send(JSON.stringify(envelope));
      } catch (error) {
        this.rejectPendingRequest(requestID, formatError(error));
        this.resetConnection(new Error(`desktop websocket send failed: ${formatError(error)}`), true);
      }
    });
  }

  private async ensureConnected(): Promise<DesktopWebSocketLike> {
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

  private async openConnection(): Promise<DesktopWebSocketLike> {
    let lastError: Error | undefined;

    for (const candidate of this.resolveCandidates()) {
      try {
        const socket = await this.connectCandidate(candidate);
        this.bindSocket(socket, candidate.endpoint);
        return socket;
      } catch (error) {
        lastError = new Error('desktop websocket unavailable');
      }
    }

    throw lastError ?? new Error('desktop websocket unavailable');
  }

  private resolveCandidates(): Array<{ endpoint: string; token?: string }> {
    const candidates = buildDesktopEndpointCandidates(this.preferredBaseURL)
      .map((candidate) => ({
        endpoint: toWebSocketEndpoint(candidate.baseURL),
        token: candidate.token,
      }))
      .filter((candidate) => candidate.endpoint !== '');
    return dedupeCandidates(candidates);
  }

  private connectCandidate(candidate: { endpoint: string; token?: string }): Promise<DesktopWebSocketLike> {
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

  private bindSocket(socket: DesktopWebSocketLike, endpoint: string): void {
    const listeners: ConnectionListeners = {
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

  private async handleSocketMessage(event: DesktopWebSocketEvent): Promise<void> {
    let text: string;
    try {
      text = await decodeWebSocketMessageData(event.data);
    } catch (error) {
      this.resetConnection(new Error(`desktop websocket message decode failed: ${formatError(error)}`), true);
      return;
    }

    let envelope: ResponseEnvelope;
    try {
      envelope = JSON.parse(text) as ResponseEnvelope;
    } catch {
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

  private rejectPendingRequest(requestID: string, message: string): void {
    const pending = this.pending.get(requestID);
    if (!pending) {
      return;
    }
    this.pending.delete(requestID);
    clearTimeout(pending.timeout);
    pending.reject(new Error(message));
  }

  private resetConnection(reason: Error, closeSocket: boolean): void {
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

function dedupeCandidates(values: Array<{ endpoint: string; token?: string }>): Array<{ endpoint: string; token?: string }> {
  const unique = new Map<string, { endpoint: string; token?: string }>();
  for (const value of values) {
    const key = `${value.endpoint}::${value.token ?? ''}`;
    if (!unique.has(key)) {
      unique.set(key, value);
    }
  }
  return Array.from(unique.values());
}

function toWebSocketEndpoint(baseURL: string): string {
  try {
    const parsed = new URL(baseURL);
    parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
    parsed.pathname = WS_ENDPOINT_PATH;
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function buildWebSocketProtocols(token?: string): string[] {
  if (!token) {
    return [WS_SUBPROTOCOL];
  }
  const encodedToken = Buffer.from(token, 'utf8').toString('base64url');
  return [WS_SUBPROTOCOL, `${WS_AUTH_SUBPROTOCOL_PREFIX}${encodedToken}`];
}

function createDefaultWebSocketFactory(): (url: string, protocols: string[]) => DesktopWebSocketLike {
  const ctor = (globalThis as { WebSocket?: new (url: string, protocols?: string | string[]) => DesktopWebSocketLike }).WebSocket;
  if (!ctor) {
    throw new Error('WebSocket is unavailable in this runtime');
  }
  return (url: string, protocols: string[]) => new ctor(url, protocols);
}

function safeCloseSocket(socket: DesktopWebSocketLike): void {
  try {
    socket.close();
  } catch {
    // Ignore close failures.
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return String(error);
}

async function decodeWebSocketMessageData(data: unknown): Promise<string> {
  if (typeof data === 'string') {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString('utf8');
  }
  if (Buffer.isBuffer(data)) {
    return data.toString('utf8');
  }
  if (hasTextMethod(data)) {
    return data.text();
  }
  throw new Error(`unsupported websocket message payload type: ${typeof data}`);
}

function hasTextMethod(value: unknown): value is { text: () => Promise<string> } {
  if (!value || typeof value !== 'object') {
    return false;
  }
  return typeof (value as { text?: unknown }).text === 'function';
}
