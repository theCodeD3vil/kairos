"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_test_1 = __importDefault(require("node:test"));
const filters_1 = require("../src/runtime/filters");
const client_1 = require("../src/runtime/client");
class FakeDesktopWebSocket {
    url;
    readyState = 1;
    listeners = new Map();
    constructor(url) {
        this.url = url;
        setImmediate(() => this.emit('open'));
    }
    send(data) {
        const envelope = JSON.parse(data);
        strict_1.default.equal(envelope.protocolVersion, 2);
        if (envelope.type === 'handshake.request') {
            this.emitMessage({
                id: envelope.id,
                type: 'handshake.response',
                payload: {
                    desktopInstanceId: 'desktop-instance-1',
                    protocolVersion: 2,
                    capabilities: {
                        perEventIngestionResults: true,
                        settingsSnapshotMirror: true,
                    },
                    limits: {
                        maxBatchEvents: 500,
                        maxRequestBytes: 1 << 20,
                    },
                    settings: (0, filters_1.getDefaultEffectiveSettings)(),
                    settingsVersion: 'settings-hash',
                    settingsUpdatedAt: new Date().toISOString(),
                    serverTimestamp: new Date().toISOString(),
                },
            });
            return;
        }
        if (envelope.type === 'ingest.request') {
            this.emitMessage({
                id: envelope.id,
                type: 'ingest.response',
                payload: {
                    acceptedCount: 0,
                    rejectedCount: 0,
                    warnings: [],
                    results: [],
                    serverTimestamp: new Date().toISOString(),
                },
            });
            return;
        }
        this.emitMessage({
            id: envelope.id,
            type: 'error',
            error: {
                code: 'invalid_request',
                message: `unsupported request type ${envelope.type}`,
            },
        });
    }
    close() {
        this.emit('close');
    }
    addEventListener(type, listener) {
        const existing = this.listeners.get(type) ?? new Set();
        existing.add(listener);
        this.listeners.set(type, existing);
    }
    removeEventListener(type, listener) {
        const existing = this.listeners.get(type);
        if (!existing) {
            return;
        }
        existing.delete(listener);
    }
    emit(type) {
        const listeners = this.listeners.get(type);
        if (!listeners) {
            return;
        }
        for (const listener of listeners) {
            listener();
        }
    }
    emitMessage(payload) {
        const listeners = this.listeners.get('message');
        if (!listeners) {
            return;
        }
        const encoded = JSON.stringify(payload);
        for (const listener of listeners) {
            listener({ data: encoded });
        }
    }
}
(0, node_test_1.default)('desktop client discovers websocket endpoint from shared discovery file', async () => {
    const tempDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'kairos-client-test-'));
    const discoveryPath = node_path_1.default.join(tempDir, 'desktop-bridge.json');
    const originalDiscoveryEnv = process.env.KAIROS_BRIDGE_DISCOVERY_FILE;
    const originalDesktopEnv = process.env.KAIROS_DESKTOP_URL;
    process.env.KAIROS_BRIDGE_DISCOVERY_FILE = discoveryPath;
    delete process.env.KAIROS_DESKTOP_URL;
    const discoveryPort = 43137;
    const discoveryBaseURL = `http://127.0.0.1:${discoveryPort}`;
    const discoveryToken = 'discovery-token-123';
    const discoveryWSURL = `ws://127.0.0.1:${discoveryPort}/v1/extension/ws?token=${discoveryToken}`;
    const attemptedURLs = [];
    node_fs_1.default.writeFileSync(discoveryPath, JSON.stringify({
        desktopServerUrl: discoveryBaseURL,
        desktopServerHost: '127.0.0.1',
        desktopServerPort: discoveryPort,
        desktopServerToken: discoveryToken,
        updatedAt: new Date().toISOString(),
        version: 1,
    }));
    try {
        const client = new client_1.WebSocketDesktopClient('http://127.0.0.1:1', {
            webSocketFactory: (url) => {
                attemptedURLs.push(url);
                if (url === discoveryWSURL) {
                    return new FakeDesktopWebSocket(url);
                }
                throw new Error(`dial failed ${url}`);
            },
            requestTimeoutMs: 250,
        });
        const handshake = await client.handshake({
            machine: {
                machineId: 'machine-1',
                machineName: 'test-machine',
                osPlatform: 'linux',
            },
            extension: {
                editor: 'vscode',
                editorVersion: '1.100.0',
                extensionVersion: '1.0.5',
            },
        });
        strict_1.default.equal(handshake.settings.trackingEnabled, true);
        const ingest = await client.ingestEvents({
            machine: {
                machineId: 'machine-1',
                machineName: 'test-machine',
                osPlatform: 'linux',
            },
            extension: {
                editor: 'vscode',
                editorVersion: '1.100.0',
                extensionVersion: '1.0.5',
            },
            events: [],
        });
        strict_1.default.equal(ingest.acceptedCount, 0);
        strict_1.default.ok(attemptedURLs.includes(discoveryWSURL));
    }
    finally {
        if (originalDiscoveryEnv) {
            process.env.KAIROS_BRIDGE_DISCOVERY_FILE = originalDiscoveryEnv;
        }
        else {
            delete process.env.KAIROS_BRIDGE_DISCOVERY_FILE;
        }
        if (originalDesktopEnv) {
            process.env.KAIROS_DESKTOP_URL = originalDesktopEnv;
        }
        else {
            delete process.env.KAIROS_DESKTOP_URL;
        }
        node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
    }
});
//# sourceMappingURL=client.test.js.map