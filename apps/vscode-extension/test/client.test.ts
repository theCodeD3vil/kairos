import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getDefaultEffectiveSettings } from '../src/runtime/filters';
import { WebSocketDesktopClient } from '../src/runtime/client';

type Listener = () => void;
type MessageListener = (event: { data: string }) => void;
type FakeDesktopWebSocketOptions = {
  dropResponses?: boolean;
};

class FakeDesktopWebSocket {
  readonly readyState = 1;
  closeCallCount = 0;
  private readonly listeners = new Map<string, Set<Listener | MessageListener>>();

  constructor(
    private readonly url: string,
    readonly protocols: string[] = [],
    private readonly options?: FakeDesktopWebSocketOptions,
  ) {
    setImmediate(() => this.emit('open'));
  }

  send(data: string): void {
    const envelope = JSON.parse(data) as { id: string; type: string; protocolVersion: number };
    assert.equal(envelope.protocolVersion, 2);
    if (this.options?.dropResponses) {
      return;
    }

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
          settings: getDefaultEffectiveSettings(),
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

  close(): void {
    this.closeCallCount += 1;
    this.emit('close');
  }

  addEventListener(type: 'open' | 'close' | 'error' | 'message', listener: Listener | MessageListener): void {
    const existing = this.listeners.get(type) ?? new Set();
    existing.add(listener);
    this.listeners.set(type, existing);
  }

  removeEventListener(type: 'open' | 'close' | 'error' | 'message', listener: Listener | MessageListener): void {
    const existing = this.listeners.get(type);
    if (!existing) {
      return;
    }
    existing.delete(listener);
  }

  private emit(type: 'open' | 'close' | 'error'): void {
    const listeners = this.listeners.get(type);
    if (!listeners) {
      return;
    }
    for (const listener of listeners) {
      (listener as Listener)();
    }
  }

  private emitMessage(payload: unknown): void {
    const listeners = this.listeners.get('message');
    if (!listeners) {
      return;
    }
    const encoded = JSON.stringify(payload);
    for (const listener of listeners) {
      (listener as MessageListener)({ data: encoded });
    }
  }
}

test('desktop client discovers websocket endpoint from shared discovery file', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kairos-client-test-'));
  const discoveryPath = path.join(tempDir, 'desktop-bridge.json');
  const originalDiscoveryEnv = process.env.KAIROS_BRIDGE_DISCOVERY_FILE;
  const originalDesktopEnv = process.env.KAIROS_DESKTOP_URL;
  process.env.KAIROS_BRIDGE_DISCOVERY_FILE = discoveryPath;
  delete process.env.KAIROS_DESKTOP_URL;

  const discoveryPort = 43137;
  const discoveryBaseURL = `http://127.0.0.1:${discoveryPort}`;
  const discoveryToken = 'discovery-token-123';
  const discoveryWSURL = `ws://127.0.0.1:${discoveryPort}/v1/extension/ws`;
  const expectedAuthProtocol = `kairos.auth.${Buffer.from(discoveryToken, 'utf8').toString('base64url')}`;
  const attemptedURLs: string[] = [];
  const attemptedProtocols: string[][] = [];

  fs.writeFileSync(
    discoveryPath,
    JSON.stringify({
      desktopServerUrl: discoveryBaseURL,
      desktopServerHost: '127.0.0.1',
      desktopServerPort: discoveryPort,
      desktopServerToken: discoveryToken,
      updatedAt: new Date().toISOString(),
      version: 1,
    }),
  );

  try {
    const client = new WebSocketDesktopClient('http://127.0.0.1:1', {
      webSocketFactory: (url, protocols) => {
        attemptedURLs.push(url);
        attemptedProtocols.push(protocols);
        if (url === discoveryWSURL) {
          return new FakeDesktopWebSocket(url, protocols);
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
    assert.equal(handshake.settings.trackingEnabled, true);

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
    assert.equal(ingest.acceptedCount, 0);
    assert.ok(attemptedURLs.includes(discoveryWSURL));
    assert.ok(attemptedProtocols.some((protocols) => protocols.includes('kairos.v2')));
    assert.ok(attemptedProtocols.some((protocols) => protocols.includes(expectedAuthProtocol)));
  } finally {
    if (originalDiscoveryEnv) {
      process.env.KAIROS_BRIDGE_DISCOVERY_FILE = originalDiscoveryEnv;
    } else {
      delete process.env.KAIROS_BRIDGE_DISCOVERY_FILE;
    }
    if (originalDesktopEnv) {
      process.env.KAIROS_DESKTOP_URL = originalDesktopEnv;
    } else {
      delete process.env.KAIROS_DESKTOP_URL;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('desktop client ignores non-loopback discovery hosts', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kairos-client-test-'));
  const discoveryPath = path.join(tempDir, 'desktop-bridge.json');
  const originalDiscoveryEnv = process.env.KAIROS_BRIDGE_DISCOVERY_FILE;
  const originalDesktopEnv = process.env.KAIROS_DESKTOP_URL;
  process.env.KAIROS_BRIDGE_DISCOVERY_FILE = discoveryPath;
  delete process.env.KAIROS_DESKTOP_URL;

  const attemptedURLs: string[] = [];

  fs.writeFileSync(
    discoveryPath,
    JSON.stringify({
      desktopServerUrl: 'http://192.168.1.10:43137',
      desktopServerHost: '192.168.1.10',
      desktopServerPort: 43137,
      desktopServerToken: 'token',
      updatedAt: new Date().toISOString(),
      version: 1,
    }),
  );

  try {
    const client = new WebSocketDesktopClient(undefined, {
      webSocketFactory: (url) => {
        attemptedURLs.push(url);
        throw new Error(`dial failed ${url}`);
      },
      requestTimeoutMs: 30,
    });

    await assert.rejects(
      () => client.handshake({
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
      }),
      /desktop websocket unavailable/,
    );

    assert.equal(attemptedURLs.some((url) => url.includes('192.168.1.10')), false);
  } finally {
    if (originalDiscoveryEnv) {
      process.env.KAIROS_BRIDGE_DISCOVERY_FILE = originalDiscoveryEnv;
    } else {
      delete process.env.KAIROS_BRIDGE_DISCOVERY_FILE;
    }
    if (originalDesktopEnv) {
      process.env.KAIROS_DESKTOP_URL = originalDesktopEnv;
    } else {
      delete process.env.KAIROS_DESKTOP_URL;
    }
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('desktop client resets stale socket after timeout and reconnects cleanly', async () => {
  const createdSockets: FakeDesktopWebSocket[] = [];
  const client = new WebSocketDesktopClient('http://127.0.0.1:42137', {
    requestTimeoutMs: 20,
    webSocketFactory: (url, protocols) => {
      const socket = new FakeDesktopWebSocket(url, protocols, {
        dropResponses: createdSockets.length === 0,
      });
      createdSockets.push(socket);
      return socket;
    },
  });

  await assert.rejects(
    () =>
      client.handshake({
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
      }),
    /desktop websocket request timed out \(handshake.request\)/,
  );

  assert.equal(createdSockets[0]?.closeCallCount, 1);

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
  assert.equal(handshake.protocolVersion, 2);
  assert.equal(createdSockets.length, 2);
});
