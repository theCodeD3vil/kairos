"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutboxSyncWorker = void 0;
const node_buffer_1 = require("node:buffer");
const constants_1 = require("./constants");
const outbox_limits_1 = require("./outbox-limits");
const storage_1 = require("./storage");
const OUTBOX_EVENT_SCHEMA_VERSION = 1;
const RECOVERY_ERROR_CODE = 'startup_recovery';
const AMBIGUOUS_FAILURE_CODE = 'send_ambiguous_failure';
const TEMPORARY_REJECT_CODE = 'desktop_rejected_temporary';
const LOCAL_PAYLOAD_PARSE_ERROR_CODE = 'payload_parse_error';
const LAST_SUCCESSFUL_SYNC_STATE_KEY = 'last_successful_sync_at';
class OutboxSyncWorker {
    client;
    storage;
    scheduler;
    observer;
    environment;
    compactionHandle;
    compactionTask;
    constructor(deps) {
        this.client = deps.client;
        this.storage = deps.storage;
        this.scheduler = deps.scheduler;
        this.observer = deps.observer;
        this.environment = deps.environment;
    }
    dispose() {
        this.compactionHandle?.cancel();
        this.compactionHandle = undefined;
    }
    async drain() {
        if (this.compactionTask) {
            await this.compactionTask;
        }
    }
    async recoverStaleSendingRows() {
        let recovered = 0;
        for (;;) {
            const eventIDs = await this.storage.listEventIDsByState('sending', constants_1.SENDING_RECOVERY_BATCH_SIZE);
            if (eventIDs.length === 0) {
                break;
            }
            recovered += await this.storage.revertSendingToPending({
                eventIds: eventIDs,
                errorCode: RECOVERY_ERROR_CODE,
                errorMessage: 'Recovered sending rows after restart',
            });
            if (eventIDs.length < constants_1.SENDING_RECOVERY_BATCH_SIZE) {
                break;
            }
        }
        return recovered;
    }
    async performHandshake() {
        const extensionInfo = await this.buildExtensionInfo();
        return this.client.handshake({
            machine: this.environment.machine,
            extension: extensionInfo,
        });
    }
    async enqueueEvent(event, options) {
        const record = {
            eventId: event.id,
            occurredAt: event.timestamp,
            recordedAt: this.environment.now().toISOString(),
            eventType: event.eventType,
            payloadJson: JSON.stringify(event),
            workspaceId: options.workspaceID ?? null,
            workspaceName: options.workspaceName ?? null,
            projectIdHint: options.projectIDHint ?? null,
            language: event.language ?? null,
            machineId: event.machineId,
            installationId: options.installationID,
            schemaVersion: OUTBOX_EVENT_SCHEMA_VERSION,
        };
        const beforeEnqueue = await this.getOutboxHealth(options.settings);
        if (beforeEnqueue.limitStatus.captureBlockedByHardCap) {
            return {
                kind: 'blocked_hard_cap',
                health: beforeEnqueue,
            };
        }
        await this.storage.enqueueEvent(record);
        return {
            kind: 'enqueued',
            health: await this.getOutboxHealth(options.settings),
        };
    }
    async getQueueSize() {
        const stats = await this.storage.getStats();
        return stats.pendingCount + stats.sendingCount;
    }
    async getOutboxHealth(settings) {
        const [stats, estimatedSizeBytes] = await Promise.all([
            this.storage.getStats(),
            this.storage.estimateOutboxSizeBytes(),
        ]);
        return {
            queueSize: stats.pendingCount + stats.sendingCount,
            pendingCount: stats.pendingCount,
            sendingCount: stats.sendingCount,
            quarantineCount: stats.quarantineCount,
            limitStatus: (0, outbox_limits_1.buildOutboxLimitStatus)(estimatedSizeBytes, settings),
        };
    }
    async replayPendingEvents(handshake) {
        if (!handshake.capabilities.perEventIngestionResults) {
            return {
                kind: 'error',
                queueSize: await this.getQueueSize(),
                message: 'desktop handshake does not advertise per-event ingestion results capability',
            };
        }
        const limits = resolveReplayLimits(handshake);
        let deliveredAt;
        for (;;) {
            const extensionInfo = await this.buildExtensionInfo();
            const pendingRows = await this.storage.fetchPendingBatch(limits.maxBatchEvents);
            if (pendingRows.length === 0) {
                return {
                    kind: 'ok',
                    queueSize: await this.getQueueSize(),
                    deliveredAt,
                };
            }
            const parsed = await this.buildParsedBatch(pendingRows, limits, extensionInfo);
            if (parsed.rows.length === 0) {
                return {
                    kind: 'error',
                    queueSize: await this.getQueueSize(),
                    message: 'unable to build replay request within desktop byte limits',
                };
            }
            const sendingIDs = parsed.rows.map((row) => row.eventId);
            const batchID = this.environment.randomID();
            await this.storage.markSending({
                eventIds: sendingIDs,
                attemptedAt: this.environment.now().toISOString(),
                batchId: batchID,
            });
            let response;
            try {
                response = await this.client.ingestEvents(parsed.request);
            }
            catch (error) {
                await this.storage.revertSendingToPending({
                    eventIds: sendingIDs,
                    errorCode: AMBIGUOUS_FAILURE_CODE,
                    errorMessage: formatError(error),
                });
                return {
                    kind: 'error',
                    queueSize: await this.getQueueSize(),
                    message: `batch replay failed ambiguously: ${formatError(error)}`,
                };
            }
            const classified = classifyResponseResults(response, sendingIDs);
            if (!classified) {
                await this.storage.revertSendingToPending({
                    eventIds: sendingIDs,
                    errorCode: AMBIGUOUS_FAILURE_CODE,
                    errorMessage: 'desktop response missing or invalid per-event results',
                });
                return {
                    kind: 'error',
                    queueSize: await this.getQueueSize(),
                    message: 'desktop response missing or invalid per-event results',
                };
            }
            if (classified.ackEventIDs.length > 0) {
                await this.storage.markAcked({
                    eventIds: classified.ackEventIDs,
                    ackedAt: this.environment.now().toISOString(),
                });
                this.scheduleCompaction();
            }
            if (classified.temporaryRejects.length > 0) {
                for (const reject of classified.temporaryRejects) {
                    await this.storage.revertSendingToPending({
                        eventIds: [reject.eventId],
                        errorCode: reject.code || TEMPORARY_REJECT_CODE,
                        errorMessage: reject.message ?? null,
                    });
                }
            }
            if (classified.permanentRejects.length > 0) {
                await this.storage.moveToQuarantine(classified.permanentRejects.map((reject) => ({
                    eventId: reject.eventId,
                    rejectionCode: reject.code || 'desktop_rejected_permanent',
                    rejectionMessage: reject.message ?? null,
                    quarantinedAt: this.environment.now().toISOString(),
                })));
            }
            deliveredAt = response.serverTimestamp;
            await this.persistLastSuccessfulSyncAt(response.serverTimestamp);
            const madeProgress = classified.ackEventIDs.length > 0 || classified.permanentRejects.length > 0;
            if (!madeProgress) {
                return {
                    kind: 'error',
                    queueSize: await this.getQueueSize(),
                    message: 'desktop temporarily rejected replay batch; retry required',
                };
            }
        }
    }
    async buildParsedBatch(rows, limits, extensionInfo) {
        const validRows = [];
        const parsedEvents = [];
        const invalidRows = [];
        for (const row of rows.slice(0, limits.maxBatchEvents)) {
            try {
                const parsed = JSON.parse(row.payloadJson);
                if (!parsed || typeof parsed.id !== 'string') {
                    throw new Error('invalid activity event payload shape');
                }
                validRows.push(row);
                parsedEvents.push(parsed);
            }
            catch (error) {
                this.observer.logWarn(`Outbox row ${row.eventId} moved to quarantine: ${formatError(error)}`);
                invalidRows.push(row);
            }
        }
        if (invalidRows.length > 0) {
            await this.storage.moveToQuarantine(invalidRows.map((row) => ({
                eventId: row.eventId,
                rejectionCode: LOCAL_PAYLOAD_PARSE_ERROR_CODE,
                rejectionMessage: 'Failed to parse payload_json',
                quarantinedAt: this.environment.now().toISOString(),
            })));
        }
        const extensionVariants = [extensionInfo];
        if (extensionInfo.statusReport) {
            extensionVariants.push({
                ...extensionInfo,
                statusReport: undefined,
            });
        }
        const targetCount = Math.min(limits.targetBatchEvents, validRows.length);
        for (const extensionVariant of extensionVariants) {
            for (let count = targetCount; count > 0; count -= 1) {
                const request = {
                    machine: this.environment.machine,
                    extension: extensionVariant,
                    events: parsedEvents.slice(0, count),
                };
                const bytes = node_buffer_1.Buffer.byteLength(JSON.stringify(request), 'utf8');
                if (bytes <= limits.maxRequestBytes) {
                    return {
                        request,
                        rows: validRows.slice(0, count),
                    };
                }
            }
        }
        return {
            request: {
                machine: this.environment.machine,
                extension: extensionInfo,
                events: [],
            },
            rows: [],
        };
    }
    async buildExtensionInfo() {
        const stats = await this.storage.getStats();
        const outboxSizeBytes = await this.storage.estimateOutboxSizeBytes();
        const oldestPending = await this.storage.fetchPendingBatch(1);
        const snapshot = await this.storage.readSettingsSnapshot(storage_1.SETTINGS_SNAPSHOT_DEFAULT_KEY);
        const lastSuccessfulSyncAt = await this.readLastSuccessfulSyncAt();
        const statusReport = {
            pendingEventCount: stats.pendingCount + stats.sendingCount,
            quarantinedEventCount: stats.quarantineCount,
            outboxSizeBytes,
        };
        if (oldestPending.length > 0) {
            statusReport.oldestPendingEventAt = oldestPending[0].occurredAt;
        }
        if (snapshot?.sourceInstanceId) {
            statusReport.desktopInstanceSeen = snapshot.sourceInstanceId;
        }
        if (lastSuccessfulSyncAt !== '') {
            statusReport.lastSuccessfulSyncAt = lastSuccessfulSyncAt;
        }
        return {
            ...this.environment.extension,
            statusReport,
        };
    }
    async persistLastSuccessfulSyncAt(timestamp) {
        if (!timestamp) {
            return;
        }
        await this.storage.writeSyncState({
            stateKey: LAST_SUCCESSFUL_SYNC_STATE_KEY,
            valueJson: JSON.stringify({ timestamp }),
        });
    }
    async readLastSuccessfulSyncAt() {
        const state = await this.storage.readSyncState(LAST_SUCCESSFUL_SYNC_STATE_KEY);
        if (!state?.valueJson) {
            return '';
        }
        try {
            const decoded = JSON.parse(state.valueJson);
            if (typeof decoded.timestamp === 'string') {
                return decoded.timestamp;
            }
        }
        catch (error) {
            this.observer.logWarn(`Failed to decode sync state ${LAST_SUCCESSFUL_SYNC_STATE_KEY}: ${formatError(error)}`);
        }
        return '';
    }
    scheduleCompaction() {
        if (this.compactionHandle) {
            return;
        }
        this.compactionHandle = this.scheduler.setTimeout(() => {
            this.compactionHandle = undefined;
            this.compactionTask = this.compactAckedRows()
                .catch((error) => {
                this.observer.logWarn(`Acked row compaction failed: ${formatError(error)}`);
            })
                .finally(() => {
                this.compactionTask = undefined;
            });
        }, constants_1.ACKED_COMPACTION_DELAY_MS);
    }
    async compactAckedRows() {
        for (;;) {
            const deleted = await this.storage.compactAckedRows(constants_1.ACKED_COMPACTION_CHUNK_SIZE);
            if (deleted < constants_1.ACKED_COMPACTION_CHUNK_SIZE) {
                break;
            }
        }
    }
}
exports.OutboxSyncWorker = OutboxSyncWorker;
function resolveReplayLimits(handshake) {
    const handshakeBatchLimit = normalizePositiveInteger(handshake.limits.maxBatchEvents, constants_1.MAX_REPLAY_BATCH_SIZE);
    const maxBatchEvents = Math.min(constants_1.MAX_REPLAY_BATCH_SIZE, handshakeBatchLimit);
    const targetBatchEvents = Math.min(constants_1.DEFAULT_REPLAY_TARGET_BATCH_SIZE, maxBatchEvents);
    const maxRequestBytes = normalizePositiveInteger(handshake.limits.maxRequestBytes, constants_1.DEFAULT_MAX_REQUEST_BYTES);
    return {
        maxBatchEvents,
        maxRequestBytes,
        targetBatchEvents,
    };
}
function classifyResponseResults(response, expectedEventIDs) {
    if (!Array.isArray(response.results)) {
        return null;
    }
    const byEventID = new Map();
    for (const result of response.results) {
        if (!result || typeof result.eventId !== 'string' || typeof result.status !== 'string') {
            return null;
        }
        if (byEventID.has(result.eventId)) {
            return null;
        }
        byEventID.set(result.eventId, result);
    }
    for (const eventID of expectedEventIDs) {
        if (!byEventID.has(eventID)) {
            return null;
        }
    }
    for (const eventID of byEventID.keys()) {
        if (!expectedEventIDs.includes(eventID)) {
            return null;
        }
    }
    const classified = {
        ackEventIDs: [],
        temporaryRejects: [],
        permanentRejects: [],
    };
    for (const eventID of expectedEventIDs) {
        const result = byEventID.get(eventID);
        if (!result) {
            return null;
        }
        switch (result.status) {
            case 'accepted':
            case 'duplicate':
                classified.ackEventIDs.push(eventID);
                break;
            case 'rejected_temporary':
                classified.temporaryRejects.push(result);
                break;
            case 'rejected_permanent':
                classified.permanentRejects.push(result);
                break;
            default:
                return null;
        }
    }
    return classified;
}
function normalizePositiveInteger(value, fallback) {
    if (!Number.isFinite(value) || !value || value <= 0) {
        return fallback;
    }
    return Math.floor(value);
}
function formatError(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
//# sourceMappingURL=sync-worker.js.map