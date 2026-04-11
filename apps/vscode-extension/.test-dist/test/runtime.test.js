"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const constants_1 = require("../src/runtime/constants");
const filters_1 = require("../src/runtime/filters");
const runtime_1 = require("../src/runtime/runtime");
const storage_1 = require("../src/runtime/storage");
const machine = {
    machineId: 'machine-1',
    machineName: 'Kairos Dev Machine',
    hostname: 'kairos.local',
    osPlatform: 'darwin',
    osVersion: '14.0',
    arch: 'arm64',
};
const extension = {
    editor: 'vscode',
    editorVersion: '1.100.0',
    extensionVersion: '0.1.0',
};
const baseContext = {
    workspaceId: '/workspace/kairos',
    projectName: 'kairos',
    language: 'typescript',
    filePath: '/workspace/kairos/src/app.ts',
    gitBranch: 'main',
};
const scmInputContext = {
    workspaceId: 'no-workspace',
    projectName: 'no-workspace',
    language: 'scminput',
};
(0, node_test_1.default)('trackingEnabled=false suppresses event emission', async () => {
    const harness = createHarness({
        trackingEnabled: false,
    });
    await harness.runtime.start();
    await harness.runtime.recordEdit(baseContext);
    strict_1.default.equal(harness.client.ingestRequests.length, 0);
    strict_1.default.equal(harness.runtime.getBufferedEventCount(), 0);
});
(0, node_test_1.default)('today tracked minutes are derived from retained activity windows', async () => {
    const harness = createHarness({});
    await harness.runtime.start();
    await qualifyActiveFile(harness);
    await harness.runtime.recordEdit(baseContext);
    harness.setNow('2026-04-06T10:04:00Z');
    await harness.runtime.recordEdit(baseContext);
    const snapshot = harness.runtime.getStatusSnapshot();
    strict_1.default.equal(snapshot.todayTrackedMinutes, 5);
    strict_1.default.equal(snapshot.displayState, 'active');
});
(0, node_test_1.default)('startup degrades gracefully when desktop is unavailable', async () => {
    const harness = createHarness({});
    harness.client.failNextHandshake = true;
    await harness.runtime.start();
    strict_1.default.equal(harness.runtime.getConnectionState(), 'retrying');
    strict_1.default.deepEqual(harness.runtime.getSettings(), (0, filters_1.getDefaultEffectiveSettings)());
    strict_1.default.match(harness.observer.warns[0] ?? '', /Failed to synchronize with Kairos desktop/);
});
(0, node_test_1.default)('successful start persists desktop settings snapshot', async () => {
    const harness = createHarness({});
    await harness.runtime.start();
    const snapshot = await harness.storage.readSettingsSnapshot('desktop_effective_settings');
    strict_1.default.ok(snapshot);
    strict_1.default.equal(snapshot?.version, 'settings-hash');
});
(0, node_test_1.default)('startup with cached snapshot and no desktop uses cached mirrored settings', async () => {
    const harness = createHarness({});
    harness.client.failNextHandshake = true;
    await harness.storage.writeSettingsSnapshot({
        snapshotKey: storage_1.SETTINGS_SNAPSHOT_DEFAULT_KEY,
        version: 'cached-v1',
        updatedAt: '2026-04-06T09:00:00Z',
        payloadJson: JSON.stringify({
            ...(0, filters_1.getDefaultEffectiveSettings)(),
            trackEditEvents: false,
            trackOnlyWhenFocused: true,
        }),
        sourceInstanceId: 'desktop-instance-cached',
        fetchedAt: '2026-04-06T09:30:00Z',
    });
    await harness.runtime.start();
    strict_1.default.equal(harness.runtime.getSettings().trackEditEvents, false);
    strict_1.default.equal(harness.runtime.getSettings().trackOnlyWhenFocused, true);
});
(0, node_test_1.default)('offline capture path reads effective mirrored settings', async () => {
    const harness = createHarness({});
    harness.client.failNextHandshake = true;
    await harness.storage.writeSettingsSnapshot({
        snapshotKey: storage_1.SETTINGS_SNAPSHOT_DEFAULT_KEY,
        version: 'cached-v2',
        updatedAt: '2026-04-06T09:00:00Z',
        payloadJson: JSON.stringify({
            ...(0, filters_1.getDefaultEffectiveSettings)(),
            trackEditEvents: false,
        }),
        sourceInstanceId: 'desktop-instance-cached',
        fetchedAt: '2026-04-06T09:30:00Z',
    });
    await harness.runtime.start();
    await qualifyActiveFile(harness);
    await harness.runtime.recordEdit(baseContext);
    strict_1.default.equal(harness.runtime.getBufferedEventCount(), 0);
});
(0, node_test_1.default)('trackOnlyWhenFocused=true suppresses edit events while unfocused', async () => {
    const harness = createHarness({
        trackOnlyWhenFocused: true,
    });
    await harness.runtime.start();
    await harness.runtime.updateActiveEditor(baseContext);
    await harness.runtime.setWindowFocused(false);
    const sentAfterBlur = harness.client.ingestRequests.length;
    await harness.runtime.recordEdit(baseContext);
    strict_1.default.equal(harness.client.ingestRequests.length, sentAfterBlur);
});
(0, node_test_1.default)('desktop exclusions prevent matching events from being sent', async () => {
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
    strict_1.default.equal(harness.client.ingestRequests.length, 0);
});
(0, node_test_1.default)('filePathMode privacy shaping masks file paths before send', async () => {
    const harness = createHarness({
        filePathMode: 'masked',
    });
    await harness.runtime.start();
    await qualifyActiveFile(harness);
    await harness.runtime.recordEdit(baseContext);
    strict_1.default.ok(harness.client.ingestRequests.length >= 1);
    const lastBatch = harness.client.ingestRequests.at(-1);
    strict_1.default.equal(lastBatch?.events[0]?.filePath, 'app.ts');
});
(0, node_test_1.default)('heartbeat interval settings are applied', async () => {
    const harness = createHarness({
        heartbeatIntervalSeconds: 1,
    });
    await harness.runtime.start();
    await qualifyActiveFile(harness);
    harness.scheduler.advanceBy(1000);
    await flushMicrotasks();
    strict_1.default.equal(harness.client.ingestRequests.length, 0);
});
(0, node_test_1.default)('non-coding contexts are ignored', async () => {
    const harness = createHarness({});
    await harness.runtime.start();
    await harness.runtime.updateActiveEditor(scmInputContext);
    await harness.runtime.setWindowFocused(false);
    await harness.runtime.setWindowFocused(true);
    await harness.runtime.recordEdit(scmInputContext);
    strict_1.default.equal(harness.client.ingestRequests.length, 0);
});
(0, node_test_1.default)('offline buffering keeps events in memory when enabled', async () => {
    const harness = createHarness({
        bufferEventsWhenOffline: true,
        retryConnectionAutomatically: false,
    });
    harness.client.failNextIngest = true;
    await harness.runtime.start();
    await qualifyActiveFile(harness);
    await harness.runtime.recordEdit(baseContext);
    strict_1.default.ok(harness.runtime.getBufferedEventCount() >= 1);
    strict_1.default.equal(harness.runtime.getConnectionState(), 'offline-buffering');
});
(0, node_test_1.default)('offline queue persists captured events without dropping', async () => {
    const harness = createHarness({
        bufferEventsWhenOffline: true,
        retryConnectionAutomatically: false,
    });
    await qualifyActiveFile(harness);
    for (let index = 0; index < 200; index += 1) {
        await harness.runtime.recordEdit(baseContext);
    }
    strict_1.default.equal(harness.runtime.getBufferedEventCount(), 200);
});
(0, node_test_1.default)('hard-cap enforcement blocks new capture and exposes status state', async () => {
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
    strict_1.default.equal(harness.runtime.getBufferedEventCount(), bufferedBeforeBlock);
    const snapshot = harness.runtime.getStatusSnapshot();
    strict_1.default.equal(snapshot.captureBlockedByHardCap, true);
    strict_1.default.equal(snapshot.outboxThresholdState, 'hard');
    strict_1.default.ok(harness.observer.warns.some((message) => message.includes('outbox hard cap')));
});
(0, node_test_1.default)('replay reduces backlog and re-enables capture when outbox drops below hard cap', async () => {
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
    strict_1.default.equal(harness.runtime.getStatusSnapshot().captureBlockedByHardCap, true);
    await harness.runtime.refreshSettings();
    await waitForBufferedCount(harness, 0);
    strict_1.default.equal(harness.runtime.getStatusSnapshot().captureBlockedByHardCap, false);
    strict_1.default.equal(harness.runtime.getStatusSnapshot().outboxThresholdState, 'normal');
    const sentBefore = harness.client.ingestRequests.length;
    await harness.runtime.recordEdit(baseContext);
    strict_1.default.ok(harness.client.ingestRequests.length > sentBefore);
});
(0, node_test_1.default)('retry behavior reconnects and flushes buffered events', async () => {
    const harness = createHarness({
        bufferEventsWhenOffline: true,
        retryConnectionAutomatically: true,
    });
    harness.client.failNextIngest = true;
    await harness.runtime.start();
    await qualifyActiveFile(harness);
    await harness.runtime.recordEdit(baseContext);
    strict_1.default.equal(harness.runtime.getConnectionState(), 'offline-buffering');
    harness.scheduler.advanceBy(constants_1.INITIAL_RETRY_DELAY_MS);
    await waitForConnectionState(harness, 'connected');
    await waitForBufferedCount(harness, 0);
    strict_1.default.ok(harness.client.handshakeRequests.length >= 2);
    strict_1.default.equal(harness.client.ingestRequests.length, 2);
});
(0, node_test_1.default)('connection probe detects idle disconnects and recovers via retry loop', async () => {
    const harness = createHarness({
        retryConnectionAutomatically: true,
    });
    await harness.runtime.start();
    strict_1.default.equal(harness.runtime.getConnectionState(), 'connected');
    strict_1.default.equal(harness.client.handshakeRequests.length, 1);
    harness.client.failNextHandshake = true;
    harness.scheduler.advanceBy(constants_1.CONNECTION_PROBE_INTERVAL_MS);
    await waitForConnectionState(harness, 'retrying');
    harness.scheduler.advanceBy(constants_1.INITIAL_RETRY_DELAY_MS);
    await waitForConnectionState(harness, 'connected');
    strict_1.default.ok(harness.client.handshakeRequests.length >= 3);
});
(0, node_test_1.default)('extension status updates reflect connection transitions', async () => {
    const harness = createHarness({
        bufferEventsWhenOffline: true,
        retryConnectionAutomatically: true,
    });
    harness.client.failNextIngest = true;
    await harness.runtime.start();
    await qualifyActiveFile(harness);
    await harness.runtime.recordEdit(baseContext);
    const states = harness.observer.statusUpdates.map((entry) => entry.connectionState);
    strict_1.default.ok(states.includes('connecting'));
    strict_1.default.ok(states.includes('connected'));
    strict_1.default.ok(states.includes('offline-buffering'));
});
(0, node_test_1.default)('runtime status snapshot exposes outbox threshold metrics', async () => {
    const harness = createHarness({});
    await harness.runtime.start();
    const snapshot = harness.runtime.getStatusSnapshot();
    strict_1.default.equal(snapshot.outboxThresholdState, 'normal');
    strict_1.default.equal(snapshot.captureBlockedByHardCap, false);
    strict_1.default.equal(snapshot.outboxSizeBytes, 0);
    strict_1.default.equal(snapshot.outboxSoftThresholdBytes, 100 * 1024 * 1024);
    strict_1.default.equal(snapshot.outboxWarningThresholdBytes, 250 * 1024 * 1024);
    strict_1.default.equal(snapshot.outboxHardCapBytes, 500 * 1024 * 1024);
});
(0, node_test_1.default)('settings refresh updates runtime behavior', async () => {
    const harness = createHarness({
        trackEditEvents: true,
    });
    await harness.runtime.start();
    await qualifyActiveFile(harness);
    await harness.runtime.recordEdit(baseContext);
    const beforeRefreshRequests = harness.client.ingestRequests.length;
    strict_1.default.ok(beforeRefreshRequests >= 1);
    harness.client.nextHandshakeSettings = {
        ...harness.client.settings,
        trackEditEvents: false,
    };
    await harness.runtime.refreshSettings();
    await qualifyActiveFile(harness);
    await harness.runtime.recordEdit(baseContext);
    strict_1.default.equal(harness.client.ingestRequests.length, beforeRefreshRequests);
});
(0, node_test_1.default)('disabled open/save/edit categories are respected', async () => {
    const harness = createHarness({
        trackFileOpenEvents: false,
        trackSaveEvents: false,
        trackEditEvents: false,
    });
    await harness.runtime.start();
    await harness.runtime.recordOpen(baseContext);
    await harness.runtime.recordSave(baseContext);
    await harness.runtime.recordEdit(baseContext);
    strict_1.default.equal(harness.client.ingestRequests.length, 0);
});
(0, node_test_1.default)('tracking disabled does not accumulate misleading time', async () => {
    const harness = createHarness({
        trackingEnabled: false,
    });
    await harness.runtime.start();
    harness.setNow('2026-04-06T10:20:00Z');
    const snapshot = harness.runtime.getStatusSnapshot();
    strict_1.default.equal(snapshot.todayTrackedMinutes, 0);
    strict_1.default.equal(snapshot.displayState, 'tracking-disabled');
});
function createHarness(overrides) {
    const settings = {
        ...(0, filters_1.getDefaultEffectiveSettings)(),
        ...overrides,
        exclusions: {
            ...(0, filters_1.getDefaultEffectiveSettings)().exclusions,
            ...overrides.exclusions,
        },
    };
    const client = new FakeDesktopClient(settings);
    const storage = new FakeOutboxStorage();
    const scheduler = new FakeScheduler();
    const observer = new FakeObserver();
    let now = new Date('2026-04-06T10:00:00Z');
    const runtime = new runtime_1.KairosRuntime({
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
        setNow(value) {
            now = new Date(value);
        },
    };
}
class FakeOutboxStorage {
    outbox = new Map();
    settingsSnapshots = new Map();
    syncState = new Map();
    quarantine = new Set();
    async enqueueEvent(event) {
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
    async fetchPendingBatch(limit) {
        if (limit <= 0) {
            return [];
        }
        return [...this.outbox.values()]
            .filter((row) => row.deliveryState === 'pending')
            .sort((a, b) => (a.occurredAt === b.occurredAt ? a.eventId.localeCompare(b.eventId) : a.occurredAt.localeCompare(b.occurredAt)))
            .slice(0, limit);
    }
    async listEventIDsByState(state, limit) {
        if (limit <= 0) {
            return [];
        }
        return [...this.outbox.values()]
            .filter((row) => row.deliveryState === state)
            .sort((a, b) => (a.occurredAt === b.occurredAt ? a.eventId.localeCompare(b.eventId) : a.occurredAt.localeCompare(b.occurredAt)))
            .slice(0, limit)
            .map((row) => row.eventId);
    }
    async markSending(input) {
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
    async markAcked(input) {
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
    async revertSendingToPending(input) {
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
    async moveToQuarantine(input) {
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
    async compactAckedRows(limit) {
        const deletable = [...this.outbox.values()]
            .filter((row) => row.deliveryState === 'acked')
            .sort((a, b) => (a.ackedAt === b.ackedAt ? a.eventId.localeCompare(b.eventId) : (a.ackedAt ?? '').localeCompare(b.ackedAt ?? '')))
            .slice(0, limit);
        for (const row of deletable) {
            this.outbox.delete(row.eventId);
        }
        return deletable.length;
    }
    async writeSettingsSnapshot(snapshot) {
        this.settingsSnapshots.set(snapshot.snapshotKey, snapshot);
    }
    async readSettingsSnapshot(snapshotKey = 'desktop_effective_settings') {
        return this.settingsSnapshots.get(snapshotKey) ?? null;
    }
    async writeSyncState(state) {
        this.syncState.set(state.stateKey, state);
    }
    async readSyncState(stateKey) {
        return this.syncState.get(stateKey) ?? null;
    }
    async getStats() {
        let pendingCount = 0;
        let sendingCount = 0;
        let ackedCount = 0;
        for (const row of this.outbox.values()) {
            if (row.deliveryState === 'pending') {
                pendingCount += 1;
            }
            else if (row.deliveryState === 'sending') {
                sendingCount += 1;
            }
            else if (row.deliveryState === 'acked') {
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
    async estimateOutboxSizeBytes() {
        let total = 0;
        for (const row of this.outbox.values()) {
            if (row.deliveryState !== 'pending' && row.deliveryState !== 'sending') {
                continue;
            }
            total += row.payloadJson.length;
        }
        return total;
    }
    async close() { }
}
class FakeDesktopClient {
    settings;
    handshakeRequests = [];
    ingestRequests = [];
    failNextHandshake = false;
    failNextIngest = false;
    nextHandshakeSettings;
    constructor(settings) {
        this.settings = settings;
    }
    async handshake(request) {
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
    async ingestEvents(request) {
        this.ingestRequests.push({
            ...request,
            events: request.events.map((event) => ({ ...event })),
        });
        if (this.failNextIngest) {
            this.failNextIngest = false;
            throw new Error('desktop unavailable');
        }
        return {
            acceptedCount: request.events.length,
            rejectedCount: 0,
            results: request.events.map((event) => ({
                eventId: event.id,
                status: 'accepted',
                code: 'persisted',
            })),
            serverTimestamp: new Date('2026-04-06T10:00:00Z').toISOString(),
        };
    }
}
class FakeObserver {
    infos = [];
    warns = [];
    errors = [];
    statusUpdates = [];
    logInfo(message) {
        this.infos.push(message);
    }
    logWarn(message) {
        this.warns.push(message);
    }
    logError(message) {
        this.errors.push(message);
    }
    updateStatus(snapshot) {
        this.statusUpdates.push(snapshot);
    }
}
class FakeScheduler {
    nowMs = 0;
    nextID = 1;
    timeouts = new Map();
    intervals = new Map();
    setTimeout(callback, delayMs) {
        const id = this.nextID++;
        this.timeouts.set(id, { callback, dueMs: this.nowMs + delayMs });
        return {
            cancel: () => {
                this.timeouts.delete(id);
            },
        };
    }
    setInterval(callback, intervalMs) {
        const id = this.nextID++;
        this.intervals.set(id, { callback, intervalMs, nextRunMs: this.nowMs + intervalMs });
        return {
            cancel: () => {
                this.intervals.delete(id);
            },
        };
    }
    advanceBy(durationMs) {
        const targetMs = this.nowMs + durationMs;
        while (true) {
            const nextDueMs = Math.min(...[
                ...[...this.timeouts.values()].map((timer) => timer.dueMs),
                ...[...this.intervals.values()].map((timer) => timer.nextRunMs),
                targetMs,
            ]);
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
async function flushMicrotasks() {
    await Promise.resolve();
    await Promise.resolve();
}
async function qualifyActiveFile(harness) {
    await harness.runtime.updateActiveEditor(baseContext);
    harness.scheduler.advanceBy(15_000);
    await flushMicrotasks();
}
async function waitForConnectionState(harness, expected) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        if (harness.runtime.getConnectionState() === expected) {
            return;
        }
        await flushMicrotasks();
    }
    strict_1.default.equal(harness.runtime.getConnectionState(), expected);
}
async function waitForBufferedCount(harness, expected) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
        if (harness.runtime.getBufferedEventCount() === expected) {
            return;
        }
        await flushMicrotasks();
    }
    strict_1.default.equal(harness.runtime.getBufferedEventCount(), expected);
}
//# sourceMappingURL=runtime.test.js.map