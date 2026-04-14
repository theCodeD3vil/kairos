import { Buffer } from 'node:buffer';

import type {
  ActivityEvent,
  ExtensionInfo,
  IngestEventResult,
  IngestEventsRequest,
  IngestEventsResponse,
} from '@kairos/shared/ingestion';
import type { ExtensionEffectiveSettings } from '@kairos/shared/settings';
import type { ExtensionHandshakeResponse } from '@kairos/shared/settings';

import {
  ACKED_COMPACTION_CHUNK_SIZE,
  ACKED_COMPACTION_DELAY_MS,
  DEFAULT_MAX_REQUEST_BYTES,
  DEFAULT_REPLAY_TARGET_BATCH_SIZE,
  INVALID_RESULTS_ROW_QUARANTINE_ATTEMPT_THRESHOLD,
  MAX_REPLAY_BATCH_SIZE,
  SENDING_RECOVERY_BATCH_SIZE,
} from './constants';
import { buildOutboxLimitStatus, type OutboxLimitStatus } from './outbox-limits';
import {
  SETTINGS_SNAPSHOT_DEFAULT_KEY,
  type OutboxEventInput,
  type OutboxEventRow,
  type OutboxStorageHandle,
} from './storage';
import type {
  DesktopClient,
  RuntimeEnvironment,
  RuntimeObserver,
  RuntimeScheduler,
  RuntimeSchedulerHandle,
} from './types';

const OUTBOX_EVENT_SCHEMA_VERSION = 1;
const RECOVERY_ERROR_CODE = 'startup_recovery';
const AMBIGUOUS_FAILURE_CODE = 'send_ambiguous_failure';
const TEMPORARY_REJECT_CODE = 'desktop_rejected_temporary';
const LOCAL_PAYLOAD_PARSE_ERROR_CODE = 'payload_parse_error';
const INVALID_RESULTS_ERROR_CODE = 'desktop_response_invalid_results';
const LAST_SUCCESSFUL_SYNC_STATE_KEY = 'last_successful_sync_at';

export type OutboxHealth = {
  queueSize: number;
  pendingCount: number;
  sendingCount: number;
  quarantineCount: number;
  limitStatus: OutboxLimitStatus;
};

export type EnqueueOutcome =
  | {
      kind: 'enqueued';
      health: OutboxHealth;
    }
  | {
      kind: 'blocked_hard_cap';
      health: OutboxHealth;
    };

export type ReplayOutcome =
  | {
      kind: 'ok';
      queueSize: number;
      deliveredAt?: string;
    }
  | {
      kind: 'error';
      queueSize: number;
      message: string;
    };

type ReplayLimits = {
  maxBatchEvents: number;
  maxRequestBytes: number;
  targetBatchEvents: number;
};

type ParsedBatch = {
  request: IngestEventsRequest;
  rows: OutboxEventRow[];
};

type ClassifiedResults = {
  ackEventIDs: string[];
  temporaryRejects: IngestEventResult[];
  permanentRejects: IngestEventResult[];
};

type ReplayDependencies = {
  client: DesktopClient;
  storage: OutboxStorageHandle;
  scheduler: RuntimeScheduler;
  observer: RuntimeObserver;
  environment: RuntimeEnvironment;
};

export class OutboxSyncWorker {
  private readonly client: DesktopClient;
  private readonly storage: OutboxStorageHandle;
  private readonly scheduler: RuntimeScheduler;
  private readonly observer: RuntimeObserver;
  private readonly environment: RuntimeEnvironment;

  private compactionHandle?: RuntimeSchedulerHandle;
  private compactionTask?: Promise<void>;

  constructor(deps: ReplayDependencies) {
    this.client = deps.client;
    this.storage = deps.storage;
    this.scheduler = deps.scheduler;
    this.observer = deps.observer;
    this.environment = deps.environment;
  }

  dispose(): void {
    this.compactionHandle?.cancel();
    this.compactionHandle = undefined;
  }

  async drain(): Promise<void> {
    if (this.compactionTask) {
      await this.compactionTask;
    }
  }

  async recoverStaleSendingRows(): Promise<number> {
    let recovered = 0;
    for (;;) {
      const eventIDs = await this.storage.listEventIDsByState('sending', SENDING_RECOVERY_BATCH_SIZE);
      if (eventIDs.length === 0) {
        break;
      }

      recovered += await this.storage.revertSendingToPending({
        eventIds: eventIDs,
        errorCode: RECOVERY_ERROR_CODE,
        errorMessage: 'Recovered sending rows after restart',
      });

      if (eventIDs.length < SENDING_RECOVERY_BATCH_SIZE) {
        break;
      }
    }

    return recovered;
  }

  async performHandshake(): Promise<ExtensionHandshakeResponse> {
    const extensionInfo = await this.buildExtensionInfo();
    return this.client.handshake({
      machine: this.environment.machine,
      extension: extensionInfo,
    });
  }

  async enqueueEvent(event: ActivityEvent, options: {
    workspaceID?: string;
    workspaceName?: string;
    projectIDHint?: string;
    installationID: string;
    settings: ExtensionEffectiveSettings;
  }): Promise<EnqueueOutcome> {
    const record: OutboxEventInput = {
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

  async getQueueSize(): Promise<number> {
    const stats = await this.storage.getStats();
    return stats.pendingCount + stats.sendingCount;
  }

  async getOutboxHealth(settings: ExtensionEffectiveSettings): Promise<OutboxHealth> {
    const [stats, estimatedSizeBytes] = await Promise.all([
      this.storage.getStats(),
      this.storage.estimateOutboxSizeBytes(),
    ]);

    return {
      queueSize: stats.pendingCount + stats.sendingCount,
      pendingCount: stats.pendingCount,
      sendingCount: stats.sendingCount,
      quarantineCount: stats.quarantineCount,
      limitStatus: buildOutboxLimitStatus(estimatedSizeBytes, settings),
    };
  }

  async replayPendingEvents(handshake: ExtensionHandshakeResponse): Promise<ReplayOutcome> {
    if (!handshake.capabilities.perEventIngestionResults) {
      return {
        kind: 'error',
        queueSize: await this.getQueueSize(),
        message: 'desktop handshake does not advertise per-event ingestion results capability',
      };
    }

    const limits = resolveReplayLimits(handshake);
    let deliveredAt: string | undefined;
    let forceSingleEventReplay = false;

    for (;;) {
      const extensionInfo = await this.buildExtensionInfo();
      const pendingRows = await this.storage.fetchPendingBatch(forceSingleEventReplay ? 1 : limits.maxBatchEvents);
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

      let response: IngestEventsResponse;
      try {
        response = await this.client.ingestEvents(parsed.request);
      } catch (error) {
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
        const invalidResponseMessage = 'desktop response missing or invalid per-event results';
        if (parsed.rows.length > 1) {
          await this.storage.revertSendingToPending({
            eventIds: sendingIDs,
            errorCode: AMBIGUOUS_FAILURE_CODE,
            errorMessage: invalidResponseMessage,
          });
          forceSingleEventReplay = true;
          this.observer.logWarn('Desktop replay response invalid; retrying in single-event isolation mode');
          continue;
        }

        const candidate = parsed.rows[0];
        if (candidate && candidate.attemptCount + 1 >= INVALID_RESULTS_ROW_QUARANTINE_ATTEMPT_THRESHOLD) {
          await this.storage.moveToQuarantine([
            {
              eventId: candidate.eventId,
              rejectionCode: INVALID_RESULTS_ERROR_CODE,
              rejectionMessage: invalidResponseMessage,
              quarantinedAt: this.environment.now().toISOString(),
            },
          ]);
          this.observer.logWarn(
            `Quarantined outbox row ${candidate.eventId} after repeated invalid desktop replay responses`,
          );
          forceSingleEventReplay = false;
          continue;
        }

        await this.storage.revertSendingToPending({
          eventIds: sendingIDs,
          errorCode: AMBIGUOUS_FAILURE_CODE,
          errorMessage: invalidResponseMessage,
        });

        return {
          kind: 'error',
          queueSize: await this.getQueueSize(),
          message: invalidResponseMessage,
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
        await this.storage.moveToQuarantine(
          classified.permanentRejects.map((reject) => ({
            eventId: reject.eventId,
            rejectionCode: reject.code || 'desktop_rejected_permanent',
            rejectionMessage: reject.message ?? null,
            quarantinedAt: this.environment.now().toISOString(),
          })),
        );
      }

      deliveredAt = response.serverTimestamp;
      await this.persistLastSuccessfulSyncAt(response.serverTimestamp);
      forceSingleEventReplay = false;

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

  private async buildParsedBatch(
    rows: OutboxEventRow[],
    limits: ReplayLimits,
    extensionInfo: ExtensionInfo,
  ): Promise<ParsedBatch> {
    const validRows: OutboxEventRow[] = [];
    const parsedEvents: ActivityEvent[] = [];
    const invalidRows: OutboxEventRow[] = [];

    for (const row of rows.slice(0, limits.maxBatchEvents)) {
      try {
        const parsed = JSON.parse(row.payloadJson) as ActivityEvent;
        if (!parsed || typeof parsed.id !== 'string') {
          throw new Error('invalid activity event payload shape');
        }
        validRows.push(row);
        parsedEvents.push(parsed);
      } catch (error) {
        this.observer.logWarn(`Outbox row ${row.eventId} moved to quarantine: ${formatError(error)}`);
        invalidRows.push(row);
      }
    }

    if (invalidRows.length > 0) {
      await this.storage.moveToQuarantine(
        invalidRows.map((row) => ({
          eventId: row.eventId,
          rejectionCode: LOCAL_PAYLOAD_PARSE_ERROR_CODE,
          rejectionMessage: 'Failed to parse payload_json',
          quarantinedAt: this.environment.now().toISOString(),
        })),
      );
    }

    const extensionVariants: ExtensionInfo[] = [extensionInfo];
    if (extensionInfo.statusReport) {
      extensionVariants.push({
        ...extensionInfo,
        statusReport: undefined,
      });
    }

    const targetCount = Math.min(limits.targetBatchEvents, validRows.length);
    for (const extensionVariant of extensionVariants) {
      for (let count = targetCount; count > 0; count -= 1) {
        const request: IngestEventsRequest = {
          machine: this.environment.machine,
          extension: extensionVariant,
          events: parsedEvents.slice(0, count),
        };
        const bytes = Buffer.byteLength(JSON.stringify(request), 'utf8');
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

  private async buildExtensionInfo(): Promise<ExtensionInfo> {
    const stats = await this.storage.getStats();
    const outboxSizeBytes = await this.storage.estimateOutboxSizeBytes();
    const oldestPending = await this.storage.fetchPendingBatch(1);
    const snapshot = await this.storage.readSettingsSnapshot(SETTINGS_SNAPSHOT_DEFAULT_KEY);
    const lastSuccessfulSyncAt = await this.readLastSuccessfulSyncAt();

    const statusReport: ExtensionInfo['statusReport'] = {
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

  private async persistLastSuccessfulSyncAt(timestamp: string): Promise<void> {
    if (!timestamp) {
      return;
    }
    await this.storage.writeSyncState({
      stateKey: LAST_SUCCESSFUL_SYNC_STATE_KEY,
      valueJson: JSON.stringify({ timestamp }),
    });
  }

  private async readLastSuccessfulSyncAt(): Promise<string> {
    const state = await this.storage.readSyncState(LAST_SUCCESSFUL_SYNC_STATE_KEY);
    if (!state?.valueJson) {
      return '';
    }

    try {
      const decoded = JSON.parse(state.valueJson) as { timestamp?: unknown };
      if (typeof decoded.timestamp === 'string') {
        return decoded.timestamp;
      }
    } catch (error) {
      this.observer.logWarn(`Failed to decode sync state ${LAST_SUCCESSFUL_SYNC_STATE_KEY}: ${formatError(error)}`);
    }
    return '';
  }

  private scheduleCompaction(): void {
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
    }, ACKED_COMPACTION_DELAY_MS);
  }

  private async compactAckedRows(): Promise<void> {
    for (;;) {
      const deleted = await this.storage.compactAckedRows(ACKED_COMPACTION_CHUNK_SIZE);
      if (deleted < ACKED_COMPACTION_CHUNK_SIZE) {
        break;
      }
    }
  }
}

function resolveReplayLimits(handshake: ExtensionHandshakeResponse): ReplayLimits {
  const handshakeBatchLimit = normalizePositiveInteger(handshake.limits.maxBatchEvents, MAX_REPLAY_BATCH_SIZE);
  const maxBatchEvents = Math.min(MAX_REPLAY_BATCH_SIZE, handshakeBatchLimit);
  const targetBatchEvents = Math.min(DEFAULT_REPLAY_TARGET_BATCH_SIZE, maxBatchEvents);
  const maxRequestBytes = normalizePositiveInteger(handshake.limits.maxRequestBytes, DEFAULT_MAX_REQUEST_BYTES);

  return {
    maxBatchEvents,
    maxRequestBytes,
    targetBatchEvents,
  };
}

function classifyResponseResults(
  response: IngestEventsResponse,
  expectedEventIDs: string[],
): ClassifiedResults | null {
  if (!Array.isArray(response.results)) {
    return null;
  }

  const byEventID = new Map<string, IngestEventResult>();
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

  const classified: ClassifiedResults = {
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

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value) || !value || value <= 0) {
    return fallback;
  }
  return Math.floor(value);
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
