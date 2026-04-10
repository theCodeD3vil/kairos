import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import type { ActivityEvent, IngestEventsRequest, IngestEventsResponse, MachineInfo } from '@kairos/shared/ingestion';
import type { ExtensionEffectiveSettings, ExtensionHandshakeRequest, ExtensionHandshakeResponse } from '@kairos/shared/settings';

import { ACKED_COMPACTION_DELAY_MS } from '../src/runtime/constants';
import { getDefaultEffectiveSettings } from '../src/runtime/filters';
import { OutboxSyncWorker } from '../src/runtime/sync-worker';
import { openOutboxStorage, OUTBOX_DATABASE_FILE_NAME, type OutboxStorageHandle } from '../src/runtime/storage';
import type { DesktopClient, RuntimeObserver, RuntimeScheduler, RuntimeSchedulerHandle } from '../src/runtime/types';

const machine: MachineInfo = {
  machineId: 'machine-1',
  machineName: 'Kairos Dev Machine',
  hostname: 'kairos.local',
  osPlatform: 'darwin',
  osVersion: '14.0',
  arch: 'arm64',
};

const extension = {
  editor: 'vscode' as const,
  editorVersion: '1.100.0',
  extensionVersion: '0.1.0',
};

test('happy path replay transitions pending to acked', async () => {
  const harness = await createHarness();
  try {
    await seedEvent(harness.storage, createEvent('evt-1'));
    await seedEvent(harness.storage, createEvent('evt-2'));

    const outcome = await harness.worker.replayPendingEvents(harness.client.handshakeResponse);
    assert.equal(outcome.kind, 'ok');
    assert.equal(await countState(harness.storage, 'pending'), 0);
    assert.equal(await countState(harness.storage, 'sending'), 0);
    assert.equal(await countState(harness.storage, 'acked'), 2);
  } finally {
    await harness.close();
  }
});

test('duplicate results are treated as safe-to-clear acknowledgements', async () => {
  const harness = await createHarness();
  try {
    await seedEvent(harness.storage, createEvent('evt-1'));
    harness.client.nextIngestResponse = ({ events }: IngestEventsRequest): IngestEventsResponse => ({
      acceptedCount: 0,
      rejectedCount: 1,
      results: events.map((event: IngestEventsRequest['events'][number]) => ({
        eventId: event.id,
        status: 'duplicate',
        code: 'duplicate_event_id',
      })),
      serverTimestamp: '2026-04-09T12:00:00Z',
    });

    const outcome = await harness.worker.replayPendingEvents(harness.client.handshakeResponse);
    assert.equal(outcome.kind, 'ok');
    assert.equal(await countState(harness.storage, 'pending'), 0);
    assert.equal(await countState(harness.storage, 'acked'), 1);
  } finally {
    await harness.close();
  }
});

test('temporary rejects are reverted back to pending', async () => {
  const harness = await createHarness();
  try {
    await seedEvent(harness.storage, createEvent('evt-1'));
    harness.client.nextIngestResponse = ({ events }: IngestEventsRequest): IngestEventsResponse => ({
      acceptedCount: 0,
      rejectedCount: 1,
      results: events.map((event: IngestEventsRequest['events'][number]) => ({
        eventId: event.id,
        status: 'rejected_temporary',
        code: 'desktop_busy',
        message: 'retry later',
      })),
      serverTimestamp: '2026-04-09T12:00:00Z',
    });

    const outcome = await harness.worker.replayPendingEvents(harness.client.handshakeResponse);
    assert.equal(outcome.kind, 'error');
    const pending = await harness.storage.fetchPendingBatch(10);
    assert.equal(pending.length, 1);
    assert.equal(pending[0].eventId, 'evt-1');
    assert.equal(pending[0].lastErrorCode, 'desktop_busy');
  } finally {
    await harness.close();
  }
});

test('permanent rejects are moved to quarantine', async () => {
  const harness = await createHarness();
  try {
    await seedEvent(harness.storage, createEvent('evt-1'));
    harness.client.nextIngestResponse = ({ events }: IngestEventsRequest): IngestEventsResponse => ({
      acceptedCount: 0,
      rejectedCount: 1,
      results: events.map((event: IngestEventsRequest['events'][number]) => ({
        eventId: event.id,
        status: 'rejected_permanent',
        code: 'invalid_event',
        message: 'invalid payload',
      })),
      serverTimestamp: '2026-04-09T12:00:00Z',
    });

    const outcome = await harness.worker.replayPendingEvents(harness.client.handshakeResponse);
    assert.equal(outcome.kind, 'ok');
    const stats = await harness.storage.getStats();
    assert.equal(stats.pendingCount, 0);
    assert.equal(stats.sendingCount, 0);
    assert.equal(stats.quarantineCount, 1);
  } finally {
    await harness.close();
  }
});

test('ambiguous replay failures revert sending rows back to pending', async () => {
  const harness = await createHarness();
  try {
    await seedEvent(harness.storage, createEvent('evt-1'));
    harness.client.failNextIngest = true;

    const outcome = await harness.worker.replayPendingEvents(harness.client.handshakeResponse);
    assert.equal(outcome.kind, 'error');

    const pending = await harness.storage.fetchPendingBatch(10);
    assert.equal(pending.length, 1);
    assert.equal(pending[0].eventId, 'evt-1');
    assert.equal(pending[0].deliveryState, 'pending');
    assert.equal(pending[0].lastErrorCode, 'send_ambiguous_failure');
  } finally {
    await harness.close();
  }
});

test('startup recovery reverts stale sending rows to pending', async () => {
  const harness = await createHarness();
  try {
    await seedEvent(harness.storage, createEvent('evt-1'));
    await harness.storage.markSending({
      eventIds: ['evt-1'],
      attemptedAt: '2026-04-09T12:00:00Z',
      batchId: 'batch-1',
    });

    const recovered = await harness.worker.recoverStaleSendingRows();
    assert.equal(recovered, 1);
    const pending = await harness.storage.fetchPendingBatch(10);
    assert.equal(pending.length, 1);
    assert.equal(pending[0].deliveryState, 'pending');
  } finally {
    await harness.close();
  }
});

test('delayed compaction removes acked rows outside the hot path', async () => {
  const harness = await createHarness();
  try {
    await seedEvent(harness.storage, createEvent('evt-1'));
    await harness.worker.replayPendingEvents(harness.client.handshakeResponse);
    assert.equal(await countState(harness.storage, 'acked'), 1);

    harness.scheduler.advanceBy(ACKED_COMPACTION_DELAY_MS - 1);
    await flushMicrotasks();
    assert.equal(await countState(harness.storage, 'acked'), 1);

    harness.scheduler.advanceBy(1);
    await flushMicrotasks();
    assert.equal(await countState(harness.storage, 'acked'), 0);
  } finally {
    await harness.close();
  }
});

test('replay shrinks batch to respect byte cap and configured limits', async () => {
  const harness = await createHarness({
    handshakeOverrides: {
      limits: {
        maxBatchEvents: 500,
        maxRequestBytes: 800,
      },
    },
  });
  try {
    await seedEvent(harness.storage, createEvent('evt-1', `/workspace/${'a'.repeat(180)}-file-1.ts`));
    await seedEvent(harness.storage, createEvent('evt-2', `/workspace/${'b'.repeat(180)}-file-2.ts`));
    await seedEvent(harness.storage, createEvent('evt-3', `/workspace/${'c'.repeat(180)}-file-3.ts`));

    const outcome = await harness.worker.replayPendingEvents(harness.client.handshakeResponse);
    assert.equal(outcome.kind, 'ok');
    assert.ok(harness.client.ingestRequests.length >= 2);
    assert.ok(harness.client.ingestRequests.every((request) => request.events.length <= 1));
  } finally {
    await harness.close();
  }
});

async function seedEvent(storage: OutboxStorageHandle, event: ActivityEvent): Promise<void> {
  await storage.enqueueEvent({
    eventId: event.id,
    occurredAt: event.timestamp,
    recordedAt: event.timestamp,
    eventType: event.eventType,
    payloadJson: JSON.stringify(event),
    workspaceId: event.workspaceId,
    workspaceName: event.projectName,
    projectIdHint: event.projectName,
    language: event.language,
    machineId: event.machineId,
    installationId: 'installation-1',
    schemaVersion: 1,
  });
}

async function countState(storage: OutboxStorageHandle, state: 'pending' | 'sending' | 'acked'): Promise<number> {
  const ids = await storage.listEventIDsByState(state, 1000);
  return ids.length;
}

function createEvent(eventID: string, filePath = '/workspace/file.ts'): ActivityEvent {
  return {
    id: eventID,
    timestamp: `2026-04-09T12:00:${eventID.slice(-1)}Z`,
    eventType: 'edit',
    machineId: machine.machineId,
    workspaceId: '/workspace/kairos',
    projectName: 'kairos',
    language: 'typescript',
    filePath,
  };
}

async function createHarness(options?: {
  handshakeOverrides?: Partial<ExtensionHandshakeResponse>;
}): Promise<{
  worker: OutboxSyncWorker;
  storage: OutboxStorageHandle;
  scheduler: FakeScheduler;
  client: FakeDesktopClient;
  close: () => Promise<void>;
}> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kairos-sync-worker-'));
  const dbPath = path.join(tempDir, OUTBOX_DATABASE_FILE_NAME);
  const storage = await openOutboxStorage({ databasePath: dbPath });
  const scheduler = new FakeScheduler();
  const observer = new FakeObserver();
  const client = new FakeDesktopClient(options?.handshakeOverrides);
  const worker = new OutboxSyncWorker({
    client,
    storage,
    scheduler,
    observer,
    environment: {
      now: () => new Date('2026-04-09T12:00:00Z'),
      randomID: (() => {
        let index = 0;
        return () => `batch-${++index}`;
      })(),
      machine,
      extension,
    },
  });

  return {
    worker,
    storage,
    scheduler,
    client,
    async close() {
      worker.dispose();
      await worker.drain();
      await flushMicrotasks();
      await storage.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

class FakeDesktopClient implements DesktopClient {
  readonly handshakeRequests: ExtensionHandshakeRequest[] = [];
  readonly ingestRequests: IngestEventsRequest[] = [];

  failNextIngest = false;
  nextIngestResponse?: (request: IngestEventsRequest) => IngestEventsResponse;
  readonly handshakeResponse: ExtensionHandshakeResponse;

  constructor(overrides?: Partial<ExtensionHandshakeResponse>) {
    const baseSettings = getDefaultEffectiveSettings() as ExtensionEffectiveSettings;
    this.handshakeResponse = {
      desktopInstanceId: 'desktop-instance-1',
      protocolVersion: 2,
      capabilities: {
        perEventIngestionResults: true,
        settingsSnapshotMirror: true,
      },
      limits: {
        maxBatchEvents: 500,
        maxRequestBytes: 1048576,
      },
      settings: baseSettings,
      settingsVersion: 'settings-v1',
      settingsUpdatedAt: '2026-04-09T11:59:00Z',
      serverTimestamp: '2026-04-09T12:00:00Z',
      ...overrides,
    };
  }

  async handshake(request: ExtensionHandshakeRequest): Promise<ExtensionHandshakeResponse> {
    this.handshakeRequests.push(request);
    return this.handshakeResponse;
  }

  async ingestEvents(request: IngestEventsRequest): Promise<IngestEventsResponse> {
    this.ingestRequests.push({
      ...request,
      events: request.events.map((event: IngestEventsRequest['events'][number]) => ({ ...event })),
    });

    if (this.failNextIngest) {
      this.failNextIngest = false;
      throw new Error('desktop unavailable');
    }

    if (this.nextIngestResponse) {
      return this.nextIngestResponse(request);
    }

    return {
      acceptedCount: request.events.length,
      rejectedCount: 0,
      results: request.events.map((event: IngestEventsRequest['events'][number]) => ({
        eventId: event.id,
        status: 'accepted',
        code: 'persisted',
      })),
      serverTimestamp: '2026-04-09T12:00:00Z',
    };
  }
}

class FakeObserver implements RuntimeObserver {
  readonly infos: string[] = [];
  readonly warns: string[] = [];
  readonly errors: string[] = [];

  logInfo(message: string): void {
    this.infos.push(message);
  }

  logWarn(message: string): void {
    this.warns.push(message);
  }

  logError(message: string): void {
    this.errors.push(message);
  }

  updateStatus(): void {}
}

class FakeScheduler implements RuntimeScheduler {
  private nowMs = 0;
  private nextID = 1;
  private readonly timeouts = new Map<number, { dueMs: number; callback: () => void }>();

  setTimeout(callback: () => void, delayMs: number): RuntimeSchedulerHandle {
    const id = this.nextID++;
    this.timeouts.set(id, { callback, dueMs: this.nowMs + delayMs });
    return {
      cancel: () => {
        this.timeouts.delete(id);
      },
    };
  }

  setInterval(): RuntimeSchedulerHandle {
    return {
      cancel: () => {},
    };
  }

  advanceBy(durationMs: number): void {
    const target = this.nowMs + durationMs;
    for (;;) {
      const next = [...this.timeouts.entries()].sort((a, b) => a[1].dueMs - b[1].dueMs)[0];
      if (!next || next[1].dueMs > target) {
        break;
      }

      this.nowMs = next[1].dueMs;
      this.timeouts.delete(next[0]);
      next[1].callback();
    }
    this.nowMs = target;
  }
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
