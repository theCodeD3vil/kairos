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
const constants_1 = require("../src/runtime/constants");
const filters_1 = require("../src/runtime/filters");
const sync_worker_1 = require("../src/runtime/sync-worker");
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
(0, node_test_1.default)('happy path replay transitions pending to acked', async () => {
    const harness = await createHarness();
    try {
        await seedEvent(harness.storage, createEvent('evt-1'));
        await seedEvent(harness.storage, createEvent('evt-2'));
        const outcome = await harness.worker.replayPendingEvents(harness.client.handshakeResponse);
        strict_1.default.equal(outcome.kind, 'ok');
        strict_1.default.equal(await countState(harness.storage, 'pending'), 0);
        strict_1.default.equal(await countState(harness.storage, 'sending'), 0);
        strict_1.default.equal(await countState(harness.storage, 'acked'), 2);
    }
    finally {
        await harness.close();
    }
});
(0, node_test_1.default)('duplicate results are treated as safe-to-clear acknowledgements', async () => {
    const harness = await createHarness();
    try {
        await seedEvent(harness.storage, createEvent('evt-1'));
        harness.client.nextIngestResponse = ({ events }) => ({
            acceptedCount: 0,
            rejectedCount: 1,
            results: events.map((event) => ({
                eventId: event.id,
                status: 'duplicate',
                code: 'duplicate_event_id',
            })),
            serverTimestamp: '2026-04-09T12:00:00Z',
        });
        const outcome = await harness.worker.replayPendingEvents(harness.client.handshakeResponse);
        strict_1.default.equal(outcome.kind, 'ok');
        strict_1.default.equal(await countState(harness.storage, 'pending'), 0);
        strict_1.default.equal(await countState(harness.storage, 'acked'), 1);
    }
    finally {
        await harness.close();
    }
});
(0, node_test_1.default)('temporary rejects are reverted back to pending', async () => {
    const harness = await createHarness();
    try {
        await seedEvent(harness.storage, createEvent('evt-1'));
        harness.client.nextIngestResponse = ({ events }) => ({
            acceptedCount: 0,
            rejectedCount: 1,
            results: events.map((event) => ({
                eventId: event.id,
                status: 'rejected_temporary',
                code: 'desktop_busy',
                message: 'retry later',
            })),
            serverTimestamp: '2026-04-09T12:00:00Z',
        });
        const outcome = await harness.worker.replayPendingEvents(harness.client.handshakeResponse);
        strict_1.default.equal(outcome.kind, 'error');
        const pending = await harness.storage.fetchPendingBatch(10);
        strict_1.default.equal(pending.length, 1);
        strict_1.default.equal(pending[0].eventId, 'evt-1');
        strict_1.default.equal(pending[0].lastErrorCode, 'desktop_busy');
    }
    finally {
        await harness.close();
    }
});
(0, node_test_1.default)('permanent rejects are moved to quarantine', async () => {
    const harness = await createHarness();
    try {
        await seedEvent(harness.storage, createEvent('evt-1'));
        harness.client.nextIngestResponse = ({ events }) => ({
            acceptedCount: 0,
            rejectedCount: 1,
            results: events.map((event) => ({
                eventId: event.id,
                status: 'rejected_permanent',
                code: 'invalid_event',
                message: 'invalid payload',
            })),
            serverTimestamp: '2026-04-09T12:00:00Z',
        });
        const outcome = await harness.worker.replayPendingEvents(harness.client.handshakeResponse);
        strict_1.default.equal(outcome.kind, 'ok');
        const stats = await harness.storage.getStats();
        strict_1.default.equal(stats.pendingCount, 0);
        strict_1.default.equal(stats.sendingCount, 0);
        strict_1.default.equal(stats.quarantineCount, 1);
    }
    finally {
        await harness.close();
    }
});
(0, node_test_1.default)('ambiguous replay failures revert sending rows back to pending', async () => {
    const harness = await createHarness();
    try {
        await seedEvent(harness.storage, createEvent('evt-1'));
        harness.client.failNextIngest = true;
        const outcome = await harness.worker.replayPendingEvents(harness.client.handshakeResponse);
        strict_1.default.equal(outcome.kind, 'error');
        const pending = await harness.storage.fetchPendingBatch(10);
        strict_1.default.equal(pending.length, 1);
        strict_1.default.equal(pending[0].eventId, 'evt-1');
        strict_1.default.equal(pending[0].deliveryState, 'pending');
        strict_1.default.equal(pending[0].lastErrorCode, 'send_ambiguous_failure');
    }
    finally {
        await harness.close();
    }
});
(0, node_test_1.default)('startup recovery reverts stale sending rows to pending', async () => {
    const harness = await createHarness();
    try {
        await seedEvent(harness.storage, createEvent('evt-1'));
        await harness.storage.markSending({
            eventIds: ['evt-1'],
            attemptedAt: '2026-04-09T12:00:00Z',
            batchId: 'batch-1',
        });
        const recovered = await harness.worker.recoverStaleSendingRows();
        strict_1.default.equal(recovered, 1);
        const pending = await harness.storage.fetchPendingBatch(10);
        strict_1.default.equal(pending.length, 1);
        strict_1.default.equal(pending[0].deliveryState, 'pending');
    }
    finally {
        await harness.close();
    }
});
(0, node_test_1.default)('delayed compaction removes acked rows outside the hot path', async () => {
    const harness = await createHarness();
    try {
        await seedEvent(harness.storage, createEvent('evt-1'));
        await harness.worker.replayPendingEvents(harness.client.handshakeResponse);
        strict_1.default.equal(await countState(harness.storage, 'acked'), 1);
        harness.scheduler.advanceBy(constants_1.ACKED_COMPACTION_DELAY_MS - 1);
        await flushMicrotasks();
        strict_1.default.equal(await countState(harness.storage, 'acked'), 1);
        harness.scheduler.advanceBy(1);
        await flushMicrotasks();
        strict_1.default.equal(await countState(harness.storage, 'acked'), 0);
    }
    finally {
        await harness.close();
    }
});
(0, node_test_1.default)('replay shrinks batch to respect byte cap and configured limits', async () => {
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
        strict_1.default.equal(outcome.kind, 'ok');
        strict_1.default.ok(harness.client.ingestRequests.length >= 2);
        strict_1.default.ok(harness.client.ingestRequests.every((request) => request.events.length <= 1));
    }
    finally {
        await harness.close();
    }
});
async function seedEvent(storage, event) {
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
async function countState(storage, state) {
    const ids = await storage.listEventIDsByState(state, 1000);
    return ids.length;
}
function createEvent(eventID, filePath = '/workspace/file.ts') {
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
async function createHarness(options) {
    const tempDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'kairos-sync-worker-'));
    const dbPath = node_path_1.default.join(tempDir, storage_1.OUTBOX_DATABASE_FILE_NAME);
    const storage = await (0, storage_1.openOutboxStorage)({ databasePath: dbPath });
    const scheduler = new FakeScheduler();
    const observer = new FakeObserver();
    const client = new FakeDesktopClient(options?.handshakeOverrides);
    const worker = new sync_worker_1.OutboxSyncWorker({
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
            node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        },
    };
}
class FakeDesktopClient {
    handshakeRequests = [];
    ingestRequests = [];
    failNextIngest = false;
    nextIngestResponse;
    handshakeResponse;
    constructor(overrides) {
        const baseSettings = (0, filters_1.getDefaultEffectiveSettings)();
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
    async handshake(request) {
        this.handshakeRequests.push(request);
        return this.handshakeResponse;
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
        if (this.nextIngestResponse) {
            return this.nextIngestResponse(request);
        }
        return {
            acceptedCount: request.events.length,
            rejectedCount: 0,
            results: request.events.map((event) => ({
                eventId: event.id,
                status: 'accepted',
                code: 'persisted',
            })),
            serverTimestamp: '2026-04-09T12:00:00Z',
        };
    }
}
class FakeObserver {
    infos = [];
    warns = [];
    errors = [];
    logInfo(message) {
        this.infos.push(message);
    }
    logWarn(message) {
        this.warns.push(message);
    }
    logError(message) {
        this.errors.push(message);
    }
    updateStatus() { }
}
class FakeScheduler {
    nowMs = 0;
    nextID = 1;
    timeouts = new Map();
    setTimeout(callback, delayMs) {
        const id = this.nextID++;
        this.timeouts.set(id, { callback, dueMs: this.nowMs + delayMs });
        return {
            cancel: () => {
                this.timeouts.delete(id);
            },
        };
    }
    setInterval() {
        return {
            cancel: () => { },
        };
    }
    advanceBy(durationMs) {
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
async function flushMicrotasks() {
    await Promise.resolve();
    await Promise.resolve();
}
//# sourceMappingURL=sync-worker.test.js.map