import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { getDefaultEffectiveSettings } from '../src/runtime/filters';
import { HTTPDesktopClient } from '../src/runtime/client';

test('desktop client discovers desktop base URL from shared discovery file', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kairos-client-test-'));
  const discoveryPath = path.join(tempDir, 'desktop-bridge.json');
  const originalDiscoveryEnv = process.env.KAIROS_BRIDGE_DISCOVERY_FILE;
  const originalDesktopEnv = process.env.KAIROS_DESKTOP_URL;
  process.env.KAIROS_BRIDGE_DISCOVERY_FILE = discoveryPath;
  delete process.env.KAIROS_DESKTOP_URL;

  const server = await createDesktopMockServer();
  try {
    const port = (server.address() as { port: number }).port;
    fs.writeFileSync(
      discoveryPath,
      JSON.stringify({
        desktopServerUrl: `http://127.0.0.1:${port}`,
        desktopServerHost: '127.0.0.1',
        desktopServerPort: port,
        updatedAt: new Date().toISOString(),
        version: 1,
      }),
    );

    const client = new HTTPDesktopClient('http://127.0.0.1:1');
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
  } finally {
    server.close();
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

async function createDesktopMockServer(): Promise<http.Server> {
  const server = http.createServer((request, response) => {
    if (request.url === '/v1/extension/handshake' && request.method === 'POST') {
      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({
        settings: getDefaultEffectiveSettings(),
        serverTimestamp: new Date().toISOString(),
      }));
      return;
    }

    if (request.url === '/v1/ingestion/events' && request.method === 'POST') {
      response.statusCode = 200;
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({
        acceptedCount: 0,
        rejectedCount: 0,
        warnings: [],
        serverTimestamp: new Date().toISOString(),
      }));
      return;
    }

    response.statusCode = 404;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ error: 'not found' }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });

  return server;
}
