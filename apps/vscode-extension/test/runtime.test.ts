import assert from 'node:assert/strict';
import test from 'node:test';

import type {
  IngestEventsRequest,
  IngestEventsResponse,
  MachineInfo,
} from '@kairos/shared/ingestion';
import type {
  ExtensionEffectiveSettings,
  ExtensionHandshakeRequest,
  ExtensionHandshakeResponse,
} from '@kairos/shared/settings';

import { CONNECTION_PROBE_INTERVAL_MS, INITIAL_RETRY_DELAY_MS } from '../src/runtime/constants';
import { getDefaultEffectiveSettings } from '../src/runtime/filters';
import { KairosRuntime } from '../src/runtime/runtime';
import type {
  OutboxDeliveryState,
  OutboxEventInput,
  OutboxEventRow,
  OutboxStorageHandle,
  SettingsSnapshotRow,
  SyncStateRow,
} from '../src/runtime/storage';
import { SETTINGS_SNAPSHOT_DEFAULT_KEY } from '../src/runtime/storage';
import type {
  DesktopClient,
  EditorContext,
  RuntimeObserver,
  RuntimeScheduler,
  RuntimeSchedulerHandle,
  RuntimeStatusSnapshot,
} from '../src/runtime/types';

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

const baseContext: EditorContext = {
  workspaceId: '/workspace/kairos',
  projectName: 'kairos',
  language: 'typescript',
  filePath: '/workspace/kairos/src/app.ts',
  gitBranch: 'main',
};

const scmInputContext: EditorContext = {
  workspaceId: 'no-workspace',
  projectName: 'no-workspace',
  language: 'scminput',
};

test('trackingEnabled=false suppresses event emission', async () => {
  const harness = createHarness({
    trackingEnabled: false,
  });

  await harness.runtime.start();
  await harness.runtime.recordEdit(baseContext);

  assert.equal(harness.client.ingestRequests.length, 0);
  assert.equal(harness.runtime.getBufferedEventCount(), 0);
});

test('today tracked minutes are derived from retained activity windows', async () => {
  const harness = createHarness({});

  await harness.runtime.start();
  await qualifyActiveFile(harness);
  await harness.runtime.recordEdit(baseContext);
  harness.setNow('2026-04-06T10:04:00Z');
  await harness.runtime.recordEdit(baseContext);

  const snapshot = harness.runtime.getStatusSnapshot();
  assert.equal(snapshot.todayTrackedMinutes, 5);
  assert.equal(snapshot.displayState, 'active');
});

test('startup degrades gracefully when desktop is unavailable', async () => {
  const harness = createHarness({});
  harness.client.failNextHandshake = true;

  await harness.runtime.start();

  assert.equal(harness.runtime.getConnectionState(), 'retrying');
  assert.deepEqual(harness.runtime.getSettings(), getDefaultEffectiveSettings());
  assert.match(harness.observer.warns[0] ?? '', /Failed to synchronize with Kairos desktop/);
});

test('successful start persists desktop settings snapshot', async () => {
  const harness = createHarness({});

  await harness.runtime.start();

  const snapshot = await harness.storage.readSettingsSnapshot('desktop_effective_settings');
  assert.ok(snapshot);
  assert.equal(snapshot?.version, 'settings-hash');
});

test('startup with cached snapshot and no desktop uses cached mirrored settings', async () => {
  const harness = createHarness({});
  harness.client.failNextHandshake = true;
  await harness.storage.writeSettingsSnapshot({
    snapshotKey: SETTINGS_SNAPSHOT_DEFAULT_KEY,
    version: 'cached-v1',
    updatedAt: '2026-04-06T09:00:00Z',
    payloadJson: JSON.stringify({
      ...getDefaultEffectiveSettings(),
      trackEditEvents: false,
      trackOnlyWhenFocused: true,
    }),
    sourceInstanceId: 'desktop-instance-cached',
    fetchedAt: '2026-04-06T09:30:00Z',
  });

  await harness.runtime.start();

  assert.equal(harness.runtime.getSettings().trackEditEvents, false);
  assert.equal(harness.runtime.getSettings().trackOnlyWhenFocused, true);
});

test('offline capture path reads effective mirrored settings', async () => {
  const harness = createHarness({});
  harness.client.failNextHandshake = true;
  await harness.storage.writeSettingsSnapshot({
    snapshotKey: SETTINGS_SNAPSHOT_DEFAULT_KEY,
    version: 'cached-v2',
    updatedAt: '2026-04-06T09:00:00Z',
    payloadJson: JSON.stringify({
      ...getDefaultEffectiveSettings(),
      trackEditEvents: false,
    }),
    sourceInstanceId: 'desktop-instance-cached',
    fetchedAt: '2026-04-06T09:30:00Z',
  });

  await harness.runtime.start();
  await qualifyActiveFile(harness);
  await harness.runtime.recordEdit(baseContext);

  assert.equal(harness.runtime.getBufferedEventCount(), 0);
});

test('trackOnlyWhenFocused=true suppresses edit events while unfocused', async () => {
  const harness = createHarness({
    trackOnlyWhenFocused: true,
  });

  await harness.runtime.start();
  await harness.runtime.updateActiveEditor(baseContext);
  await harness.runtime.setWindowFocused(false);
  const sentAfterBlur = harness.client.ingestRequests.length;

  await harness.runtime.recordEdit(baseContext);

  assert.equal(harness.client.ingestRequests.length, sentAfterBlur);
});

test('desktop exclusions prevent matching events from being sent', async () => {
  const harness = createHarness({
    exclusions: {
      folders: [],
      projectNames: ['kairos'],
      workspacePatterns: [],
      fileExtensions: [],
      machines: [],
    },
    respectDesktopExclusions: true,
  });

  await harness.runtime.start();
  await harness.runtime.recordEdit(baseContext);

  assert.equal(harness.client.ingestRequests.length, 0);
});

test('filePathMode privacy shaping masks file paths before send', async () => {
  const harness = createHarness({
    filePathMode: 'masked',
  });

  await harness.runtime.start();
  await qualifyActiveFile(harness);
  await harness.runtime.recordEdit(baseContext);

  assert.ok(harness.client.ingestRequests.length >= 1);
  const lastBatch = harness.client.ingestRequests.at(-1);
  assert.equal(lastBatch?.events[0]?.filePath, 'app.ts');
});

test('heartbeat interval settings are applied', async () => {
  const harness = createHarness({
    heartbeatIntervalSeconds: 1,
  });

  await harness.runtime.start();
  await qualifyActiveFile(harness);

  harness.scheduler.advanceBy(1000);
  await flushMicrotasks();

  assert.equal(harness.client.ingestRequests.length, 0);
});

test('non-coding contexts are ignored', async () => {
  const harness = createHarness({});

  await harness.runtime.start();
  await harness.runtime.updateActiveEditor(scmInputContext);
  await harness.runtime.setWindowFocused(false);
  await harness.runtime.setWindowFocused(true);
  await harness.runtime.recordEdit(scmInputContext);

  assert.equal(harness.client.ingestRequests.length, 0);
});

test('offline buffering keeps events in memory when enabled', async () => {
  const harness = createHarness({
    bufferEventsWhenOffline: true,
    retryConnectionAutomatically: false,
  });
  harness.client.failNextIngest = true;

  await harness.runtime.start();
  await qualifyActiveFile(harness);
  await harness.runtime.recordEdit(baseContext);

  assert.ok(harness.runtime.getBufferedEventCount() >= 1);
  assert.equal(harness.runtime.getConnectionState(), 'offline-buffering');
});

test('offline queue persists captured events without dropping', async () => {
  const harness = createHarness({
    bufferEventsWhenOffline: true,
    retryConnectionAutomatically: false,
  });
  await qualifyActiveFile(harness);

  for (let index = 0; index < 200; index += 1) {
    await harness.runtime.recordEdit(baseContext);
  }

  assert.equal(harness.runtime.getBufferedEventCount(), 200);
});

test('hard-cap enforcement blocks new capture and exposes status state', async () => {
  const harness = createHarness({
    bufferEventsWhenOffline: true,
    retryConnectionAutomatically: false,
    outboxHardCapBytes: 1,
  });
  harness.client.failNextIngest = true;

  await harness.runtime.start();
  await qualifyActiveFile(harness);
  await harness.runtime.recordEdit(baseContext);
  const bufferedBeforeBlock = harness.runtime.getBufferedEventCount();

  await harness.runtime.recordEdit(baseContext);

  assert.equal(harness.runtime.getBufferedEventCount(), bufferedBeforeBlock);
  const snapshot = harness.runtime.getStatusSnapshot();
  assert.equal(snapshot.captureBlockedByHardCap, true);
  assert.equal(snapshot.outboxThresholdState, 'hard');
  assert.ok(harness.observer.warns.some((message) => message.includes('outbox hard cap')));
});

test('replay reduces backlog and re-enables capture when outbox drops below hard cap', async () => {
  const harness = createHarness({
    bufferEventsWhenOffline: true,
    retryConnectionAutomatically: false,
    outboxHardCapBytes: 1,
  });
  harness.client.failNextIngest = true;

  await harness.runtime.start();
  await qualifyActiveFile(harness);
  await harness.runtime.recordEdit(baseContext);
  await harness.runtime.recordEdit(baseContext);
  assert.equal(harness.runtime.getStatusSnapshot().captureBlockedByHardCap, true);

  await harness.runtime.refreshSettings();
  await waitForBufferedCount(harness, 0);
  assert.equal(harness.runtime.getStatusSnapshot().captureBlockedByHardCap, false);
  assert.equal(harness.runtime.getStatusSnapshot().outboxThresholdState, 'normal');

  const sentBefore = harness.client.ingestRequests.length;
  await harness.runtime.recordEdit(baseContext);
  assert.ok(harness.client.ingestRequests.length > sentBefore);
});

test('retry behavior reconnects and flushes buffered events', async () => {
  const harness = createHarness({
    bufferEventsWhenOffline: true,
    retryConnectionAutomatically: true,
  });
  harness.client.failNextIngest = true;

  await harness.runtime.start();
  await qualifyActiveFile(harness);
  await harness.runtime.recordEdit(baseContext);

  assert.equal(harness.runtime.getConnectionState(), 'offline-buffering');
  harness.scheduler.advanceBy(INITIAL_RETRY_DELAY_MS);
  await waitForConnectionState(harness, 'connected');
  await waitForBufferedCount(harness, 0);
  assert.ok(harness.client.handshakeRequests.length >= 2);
  assert.equal(harness.client.ingestRequests.length, 2);
});

test('connection probe detects idle disconnects and recovers via retry loop', async () => {
  const harness = createHarness({
    retryConnectionAutomatically: true,
  });

  await harness.runtime.start();
  assert.equal(harness.runtime.getConnectionState(), 'connected');
  assert.equal(harness.client.handshakeRequests.length, 1);

  harness.client.failNextHandshake = true;
  harness.scheduler.advanceBy(CONNECTION_PROBE_INTERVAL_MS);
  await waitForConnectionState(harness, 'retrying');

  harness.scheduler.advanceBy(INITIAL_RETRY_DELAY_MS);
  await waitForConnectionState(harness, 'connected');
  assert.ok(harness.client.handshakeRequests.length >= 3);
});

test('extension status updates reflect connection transitions', async () => {
  const harness = createHarness({
    bufferEventsWhenOffline: true,
    retryConnectionAutomatically: true,
  });
  harness.client.failNextIngest = true;

  await harness.runtime.start();
  await qualifyActiveFile(harness);
  await harness.runtime.recordEdit(baseContext);

  const states = harness.observer.statusUpdates.map((entry) => entry.connectionState);
  assert.ok(states.includes('connecting'));
  assert.ok(states.includes('connected'));
  assert.ok(states.includes('offline-buffering'));
});

test('runtime status snapshot exposes outbox threshold metrics', async () => {
  const harness = createHarness({});
  await harness.runtime.start();

  const snapshot = harness.runtime.getStatusSnapshot();
  assert.equal(snapshot.outboxThresholdState, 'normal');
  assert.equal(snapshot.captureBlockedByHardCap, false);
  assert.equal(snapshot.outboxSizeBytes, 0);
  assert.equal(snapshot.outboxSoftThresholdBytes, 100 * 1024 * 1024);
  assert.equal(snapshot.outboxWarningThresholdBytes, 250 * 1024 * 1024);
  assert.equal(snapshot.outboxHardCapBytes, 500 * 1024 * 1024);
});

test('settings refresh updates runtime behavior', async () => {
  const harness = createHarness({
    trackEditEvents: true,
  });

  await harness.runtime.start();
  await qualifyActiveFile(harness);
  await harness.runtime.recordEdit(baseContext);
  const beforeRefreshRequests = harness.client.ingestRequests.length;
  assert.ok(beforeRefreshRequests >= 1);

  harness.client.nextHandshakeSettings = {
    ...harness.client.settings,
    trackEditEvents: false,
  };

  await harness.runtime.refreshSettings();
  await qualifyActiveFile(harness);
  await harness.runtime.recordEdit(baseContext);

  assert.equal(harness.client.ingestRequests.length, beforeRefreshRequests);
});

test('disabled open/save/edit categories are respected', async () => {
  const harness = createHarness({
    trackFileOpenEvents: false,
    trackSaveEvents: false,
    trackEditEvents: false,
  });

  await harness.runtime.start();
  await harness.runtime.recordOpen(baseContext);
  await harness.runtime.recordSave(baseContext);
  await harness.runtime.recordEdit(baseContext);

  assert.equal(harness.client.ingestRequests.length, 0);
});

test('tracking disabled does not accumulate misleading time', async () => {
  const harness = createHarness({
    trackingEnabled: false,
  });

  await harness.runtime.start();
  harness.setNow('2026-04-06T10:20:00Z');

  const snapshot = harness.runtime.getStatusSnapshot();
  assert.equal(snapshot.todayTrackedMinutes, 0);
  assert.equal(snapshot.displayState, 'tracking-disabled');
});

function createHarness(overrides: Partial<ExtensionEffectiveSettings>) {
  const settings = {
    ...getDefaultEffectiveSettings(),
    ...overrides,
    exclusions: {
      ...getDefaultEffectiveSettings().exclusions,
      ...overrides.exclusions,
    },
  };
  const client = new FakeDesktopClient(settings);
  const storage = new FakeOutboxStorage();
  const scheduler = new FakeScheduler();
  const observer = new FakeObserver();
  let now = new Date('2026-04-06T10:00:00Z');
  const runtime = new KairosRuntime({
    client,
    storage,
    observer,
    scheduler,
    environment: {
      now: () => new Date(now),
      randomID: (() => {
        let counter = 0;
        return () => `event-${++counter}`;
      })(),
      machine,
      extension,
    },
    installationID: 'installation-1',
  });

  return {
    client,
    storage,
    scheduler,
    observer,
    runtime,
    setNow(value: string | Date) {
      now = new Date(value);
    },
  };
}

class FakeOutboxStorage implements OutboxStorageHandle {
  private readonly outbox = new Map<string, OutboxEventRow>();
  private readonly settingsSnapshots = new Map<string, SettingsSnapshotRow>();
  private readonly syncState = new Map<string, SyncStateRow>();
  private readonly quarantine = new Set<string>();

  async enqueueEvent(event: OutboxEventInput): Promise<void> {
    this.outbox.set(event.eventId, {
      eventId: event.eventId,
      occurredAt: event.occurredAt,
      recordedAt: event.recordedAt,
      eventType: event.eventType,
      payloadJson: event.payloadJson,
      workspaceId: event.workspaceId ?? null,
      workspaceName: event.workspaceName ?? null,
      projectIdHint: event.projectIdHint ?? null,
      language: event.language ?? null,
      machineId: event.machineId,
      installationId: event.installationId,
      schemaVersion: event.schemaVersion,
      deliveryState: 'pending',
      attemptCount: 0,
      lastAttemptAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
      lastBatchId: null,
      ackedAt: null,
    });
  }

  async fetchPendingBatch(limit: number): Promise<OutboxEventRow[]> {
    if (limit <= 0) {
      return [];
    }
    return [...this.outbox.values()]
      .filter((row) => row.deliveryState === 'pending')
      .sort((a, b) => (a.occurredAt === b.occurredAt ? a.eventId.localeCompare(b.eventId) : a.occurredAt.localeCompare(b.occurredAt)))
      .slice(0, limit);
  }

  async listEventIDsByState(state: OutboxDeliveryState, limit: number): Promise<string[]> {
    if (limit <= 0) {
      return [];
    }
    return [...this.outbox.values()]
      .filter((row) => row.deliveryState === state)
      .sort((a, b) => (a.occurredAt === b.occurredAt ? a.eventId.localeCompare(b.eventId) : a.occurredAt.localeCompare(b.occurredAt)))
      .slice(0, limit)
      .map((row) => row.eventId);
  }

  async markSending(input: { eventIds: string[]; attemptedAt: string; batchId: string }): Promise<number> {
    let count = 0;
    for (const eventID of input.eventIds) {
      const row = this.outbox.get(eventID);
      if (!row || row.deliveryState !== 'pending') {
        continue;
      }
      row.deliveryState = 'sending';
      row.attemptCount += 1;
      row.lastAttemptAt = input.attemptedAt;
      row.lastBatchId = input.batchId;
      row.lastErrorCode = null;
      row.lastErrorMessage = null;
      count += 1;
    }
    return count;
  }

  async markAcked(input: { eventIds: string[]; ackedAt: string }): Promise<number> {
    let count = 0;
    for (const eventID of input.eventIds) {
      const row = this.outbox.get(eventID);
      if (!row) {
        continue;
      }
      row.deliveryState = 'acked';
      row.ackedAt = input.ackedAt;
      row.lastErrorCode = null;
      row.lastErrorMessage = null;
      count += 1;
    }
    return count;
  }

  async revertSendingToPending(input: { eventIds: string[]; errorCode?: string | null; errorMessage?: string | null }): Promise<number> {
    let count = 0;
    for (const eventID of input.eventIds) {
      const row = this.outbox.get(eventID);
      if (!row || row.deliveryState !== 'sending') {
        continue;
      }
      row.deliveryState = 'pending';
      row.lastErrorCode = input.errorCode ?? null;
      row.lastErrorMessage = input.errorMessage ?? null;
      row.lastBatchId = null;
      count += 1;
    }
    return count;
  }

  async moveToQuarantine(input: Array<{ eventId: string }>): Promise<number> {
    let moved = 0;
    for (const item of input) {
      if (!this.outbox.has(item.eventId)) {
        continue;
      }
      this.outbox.delete(item.eventId);
      this.quarantine.add(item.eventId);
      moved += 1;
    }
    return moved;
  }

  async compactAckedRows(limit: number): Promise<number> {
    const deletable = [...this.outbox.values()]
      .filter((row) => row.deliveryState === 'acked')
      .sort((a, b) => (a.ackedAt === b.ackedAt ? a.eventId.localeCompare(b.eventId) : (a.ackedAt ?? '').localeCompare(b.ackedAt ?? '')))
      .slice(0, limit);
    for (const row of deletable) {
      this.outbox.delete(row.eventId);
    }
    return deletable.length;
  }

  async writeSettingsSnapshot(snapshot: SettingsSnapshotRow): Promise<void> {
    this.settingsSnapshots.set(snapshot.snapshotKey, snapshot);
  }

  async readSettingsSnapshot(snapshotKey = 'desktop_effective_settings'): Promise<SettingsSnapshotRow | null> {
    return this.settingsSnapshots.get(snapshotKey) ?? null;
  }

  async writeSyncState(state: SyncStateRow): Promise<void> {
    this.syncState.set(state.stateKey, state);
  }

  async readSyncState(stateKey: string): Promise<SyncStateRow | null> {
    return this.syncState.get(stateKey) ?? null;
  }

  async getStats(): Promise<{ pendingCount: number; sendingCount: number; ackedCount: number; quarantineCount: number }> {
    let pendingCount = 0;
    let sendingCount = 0;
    let ackedCount = 0;
    for (const row of this.outbox.values()) {
      if (row.deliveryState === 'pending') {
        pendingCount += 1;
      } else if (row.deliveryState === 'sending') {
        sendingCount += 1;
      } else if (row.deliveryState === 'acked') {
        ackedCount += 1;
      }
    }
    return {
      pendingCount,
      sendingCount,
      ackedCount,
      quarantineCount: this.quarantine.size,
    };
  }

  async estimateOutboxSizeBytes(): Promise<number> {
    let total = 0;
    for (const row of this.outbox.values()) {
      if (row.deliveryState !== 'pending' && row.deliveryState !== 'sending') {
        continue;
      }
      total += row.payloadJson.length;
    }
    return total;
  }

  async close(): Promise<void> {}
}

class FakeDesktopClient implements DesktopClient {
  readonly handshakeRequests: ExtensionHandshakeRequest[] = [];
  readonly ingestRequests: IngestEventsRequest[] = [];

  failNextHandshake = false;
  failNextIngest = false;
  nextHandshakeSettings?: ExtensionEffectiveSettings;

  constructor(public settings: ExtensionEffectiveSettings) {}

  async handshake(request: ExtensionHandshakeRequest): Promise<ExtensionHandshakeResponse> {
    this.handshakeRequests.push(request);
    if (this.failNextHandshake) {
      this.failNextHandshake = false;
      throw new Error('desktop unavailable');
    }

    if (this.nextHandshakeSettings) {
      this.settings = this.nextHandshakeSettings;
      this.nextHandshakeSettings = undefined;
    }

    return {
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
      settings: this.settings,
      settingsVersion: 'settings-hash',
      settingsUpdatedAt: '2026-04-06T09:59:00Z',
      serverTimestamp: new Date('2026-04-06T10:00:00Z').toISOString(),
    };
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

    return {
      acceptedCount: request.events.length,
      rejectedCount: 0,
      results: request.events.map((event: IngestEventsRequest['events'][number]) => ({
        eventId: event.id,
        status: 'accepted' as const,
        code: 'persisted',
      })),
      serverTimestamp: new Date('2026-04-06T10:00:00Z').toISOString(),
    };
  }
}

class FakeObserver implements RuntimeObserver {
  readonly infos: string[] = [];
  readonly warns: string[] = [];
  readonly errors: string[] = [];
  readonly statusUpdates: RuntimeStatusSnapshot[] = [];

  logInfo(message: string): void {
    this.infos.push(message);
  }

  logWarn(message: string): void {
    this.warns.push(message);
  }

  logError(message: string): void {
    this.errors.push(message);
  }

  updateStatus(snapshot: RuntimeStatusSnapshot): void {
    this.statusUpdates.push(snapshot);
  }
}

class FakeScheduler implements RuntimeScheduler {
  private nowMs = 0;
  private nextID = 1;
  private timeouts = new Map<number, TimerRecord>();
  private intervals = new Map<number, IntervalRecord>();

  setTimeout(callback: () => void, delayMs: number): RuntimeSchedulerHandle {
    const id = this.nextID++;
    this.timeouts.set(id, { callback, dueMs: this.nowMs + delayMs });
    return {
      cancel: () => {
        this.timeouts.delete(id);
      },
    };
  }

  setInterval(callback: () => void, intervalMs: number): RuntimeSchedulerHandle {
    const id = this.nextID++;
    this.intervals.set(id, { callback, intervalMs, nextRunMs: this.nowMs + intervalMs });
    return {
      cancel: () => {
        this.intervals.delete(id);
      },
    };
  }

  advanceBy(durationMs: number): void {
    const targetMs = this.nowMs + durationMs;
    while (true) {
      const nextDueMs = Math.min(
        ...[
          ...[...this.timeouts.values()].map((timer) => timer.dueMs),
          ...[...this.intervals.values()].map((timer) => timer.nextRunMs),
          targetMs,
        ],
      );

      if (nextDueMs > targetMs) {
        break;
      }

      this.nowMs = nextDueMs;

      for (const [id, timer] of [...this.timeouts.entries()]) {
        if (timer.dueMs <= this.nowMs) {
          this.timeouts.delete(id);
          timer.callback();
        }
      }

      for (const timer of this.intervals.values()) {
        while (timer.nextRunMs <= this.nowMs) {
          timer.callback();
          timer.nextRunMs += timer.intervalMs;
        }
      }

      if (this.nowMs === targetMs) {
        break;
      }
    }

    this.nowMs = targetMs;
  }
}

type TimerRecord = {
  callback: () => void;
  dueMs: number;
};

type IntervalRecord = {
  callback: () => void;
  intervalMs: number;
  nextRunMs: number;
};

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function qualifyActiveFile(harness: ReturnType<typeof createHarness>): Promise<void> {
  await harness.runtime.updateActiveEditor(baseContext);
  harness.scheduler.advanceBy(15_000);
  await flushMicrotasks();
}

async function waitForConnectionState(
  harness: ReturnType<typeof createHarness>,
  expected: RuntimeStatusSnapshot['connectionState'],
): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (harness.runtime.getConnectionState() === expected) {
      return;
    }
    await flushMicrotasks();
  }
  assert.equal(harness.runtime.getConnectionState(), expected);
}

async function waitForBufferedCount(harness: ReturnType<typeof createHarness>, expected: number): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (harness.runtime.getBufferedEventCount() === expected) {
      return;
    }
    await flushMicrotasks();
  }
  assert.equal(harness.runtime.getBufferedEventCount(), expected);
}
