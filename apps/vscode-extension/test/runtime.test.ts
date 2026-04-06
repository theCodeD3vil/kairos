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

import { INITIAL_RETRY_DELAY_MS, MAX_BUFFERED_EVENTS } from '../src/runtime/constants';
import { getDefaultEffectiveSettings } from '../src/runtime/filters';
import { KairosRuntime } from '../src/runtime/runtime';
import type { ConnectionState, DesktopClient, EditorContext, RuntimeObserver, RuntimeScheduler, RuntimeSchedulerHandle } from '../src/runtime/types';

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

test('trackingEnabled=false suppresses event emission', async () => {
  const harness = createHarness({
    trackingEnabled: false,
  });

  await harness.runtime.start();
  await harness.runtime.recordEdit(baseContext);

  assert.equal(harness.client.ingestRequests.length, 0);
  assert.equal(harness.runtime.getBufferedEventCount(), 0);
});

test('startup degrades gracefully when desktop is unavailable', async () => {
  const harness = createHarness({});
  harness.client.failNextHandshake = true;

  await harness.runtime.start();

  assert.equal(harness.runtime.getConnectionState(), 'retrying');
  assert.match(harness.observer.warns[0] ?? '', /Failed to synchronize with Kairos desktop/);
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
  await harness.runtime.recordSave(baseContext);

  assert.equal(harness.client.ingestRequests.length, 1);
  assert.equal(harness.client.ingestRequests[0].events[0]?.filePath, 'app.ts');
});

test('heartbeat interval settings are applied', async () => {
  const harness = createHarness({
    heartbeatIntervalSeconds: 15,
  });

  await harness.runtime.start();
  await harness.runtime.updateActiveEditor(baseContext);

  harness.scheduler.advanceBy(15000);
  await flushMicrotasks();

  assert.equal(harness.client.ingestRequests.length, 1);
  assert.equal(harness.client.ingestRequests[0].events[0]?.eventType, 'heartbeat');
});

test('offline buffering keeps events in memory when enabled', async () => {
  const harness = createHarness({
    bufferEventsWhenOffline: true,
    retryConnectionAutomatically: false,
  });
  harness.client.failNextIngest = true;

  await harness.runtime.start();
  await harness.runtime.recordEdit(baseContext);

  assert.equal(harness.runtime.getBufferedEventCount(), 1);
  assert.equal(harness.runtime.getConnectionState(), 'offline-buffering');
});

test('queue bounds are enforced with oldest-drop behavior', async () => {
  const harness = createHarness({
    bufferEventsWhenOffline: true,
    retryConnectionAutomatically: false,
  });

  for (let index = 0; index < MAX_BUFFERED_EVENTS+25; index += 1) {
    await harness.runtime.recordEdit({
      ...baseContext,
      filePath: `/workspace/kairos/src/file-${index}.ts`,
    });
  }

  assert.equal(harness.runtime.getBufferedEventCount(), MAX_BUFFERED_EVENTS);
  assert.match(harness.observer.warns.at(-1) ?? '', /dropped 1 oldest event/);
});

test('retry behavior reconnects and flushes buffered events', async () => {
  const harness = createHarness({
    bufferEventsWhenOffline: true,
    retryConnectionAutomatically: true,
  });
  harness.client.failNextIngest = true;

  await harness.runtime.start();
  await harness.runtime.recordEdit(baseContext);

  assert.equal(harness.runtime.getConnectionState(), 'offline-buffering');
  harness.scheduler.advanceBy(INITIAL_RETRY_DELAY_MS);
  await flushMicrotasks();

  assert.equal(harness.runtime.getConnectionState(), 'connected');
  assert.equal(harness.runtime.getBufferedEventCount(), 0);
  assert.equal(harness.client.handshakeRequests.length, 2);
  assert.equal(harness.client.ingestRequests.length, 2);
});

test('extension status updates reflect connection transitions', async () => {
  const harness = createHarness({
    bufferEventsWhenOffline: true,
    retryConnectionAutomatically: true,
  });
  harness.client.failNextIngest = true;

  await harness.runtime.start();
  await harness.runtime.recordEdit(baseContext);

  const states = harness.observer.statusUpdates.map((entry) => entry.state);
  assert.ok(states.includes('connecting'));
  assert.ok(states.includes('connected'));
  assert.ok(states.includes('offline-buffering'));
});

test('settings refresh updates runtime behavior', async () => {
  const harness = createHarness({
    trackEditEvents: true,
  });

  await harness.runtime.start();
  await harness.runtime.recordEdit(baseContext);
  assert.equal(harness.client.ingestRequests.length, 1);

  harness.client.nextHandshakeSettings = {
    ...harness.client.settings,
    trackEditEvents: false,
  };

  await harness.runtime.refreshSettings();
  await harness.runtime.recordEdit(baseContext);

  assert.equal(harness.client.ingestRequests.length, 1);
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
  const scheduler = new FakeScheduler();
  const observer = new FakeObserver();
  const runtime = new KairosRuntime({
    client,
    observer,
    scheduler,
    environment: {
      now: () => new Date('2026-04-06T10:00:00Z'),
      randomID: (() => {
        let counter = 0;
        return () => `event-${++counter}`;
      })(),
      machine,
      extension,
    },
  });

  return { client, scheduler, observer, runtime };
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
      settings: this.settings,
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
      serverTimestamp: new Date('2026-04-06T10:00:00Z').toISOString(),
    };
  }
}

class FakeObserver implements RuntimeObserver {
  readonly infos: string[] = [];
  readonly warns: string[] = [];
  readonly errors: string[] = [];
  readonly statusUpdates: Array<{ state: ConnectionState; detail?: string }> = [];

  logInfo(message: string): void {
    this.infos.push(message);
  }

  logWarn(message: string): void {
    this.warns.push(message);
  }

  logError(message: string): void {
    this.errors.push(message);
  }

  updateStatus(state: ConnectionState, detail?: string): void {
    this.statusUpdates.push({ state, detail });
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
