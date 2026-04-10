import type * as vscode from 'vscode';

export const OUTBOX_SCHEMA_VERSION = 1;
export const OUTBOX_DATABASE_FILE_NAME = 'outbox.sqlite3';
export const SETTINGS_SNAPSHOT_DEFAULT_KEY = 'desktop_effective_settings';

export type OutboxDeliveryState = 'pending' | 'sending' | 'acked';

export type OutboxEventInput = {
  eventId: string;
  occurredAt: string;
  recordedAt: string;
  eventType: string;
  payloadJson: string;
  workspaceId?: string | null;
  workspaceName?: string | null;
  projectIdHint?: string | null;
  language?: string | null;
  machineId: string;
  installationId: string;
  schemaVersion: number;
};

export type OutboxEventRow = {
  eventId: string;
  occurredAt: string;
  recordedAt: string;
  eventType: string;
  payloadJson: string;
  workspaceId: string | null;
  workspaceName: string | null;
  projectIdHint: string | null;
  language: string | null;
  machineId: string;
  installationId: string;
  schemaVersion: number;
  deliveryState: OutboxDeliveryState;
  attemptCount: number;
  lastAttemptAt: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  lastBatchId: string | null;
  ackedAt: string | null;
};

export type MarkSendingInput = {
  eventIds: string[];
  attemptedAt: string;
  batchId: string;
};

export type MarkAckedInput = {
  eventIds: string[];
  ackedAt: string;
};

export type RevertSendingInput = {
  eventIds: string[];
  errorCode?: string | null;
  errorMessage?: string | null;
};

export type QuarantineInput = {
  eventId: string;
  rejectionCode: string;
  rejectionMessage?: string | null;
  quarantinedAt: string;
};

export type SettingsSnapshotRow = {
  snapshotKey: string;
  version: string;
  updatedAt: string;
  payloadJson: string;
  sourceInstanceId: string | null;
  fetchedAt: string;
};

export type SyncStateRow = {
  stateKey: string;
  valueJson: string;
};

export type OutboxStorageStats = {
  pendingCount: number;
  sendingCount: number;
  ackedCount: number;
  quarantineCount: number;
};

export type OpenOutboxStorageOptions = {
  databasePath: string;
};

export type OutboxStorageHandle = {
  enqueueEvent(event: OutboxEventInput): Promise<void>;
  fetchPendingBatch(limit: number): Promise<OutboxEventRow[]>;
  listEventIDsByState(state: OutboxDeliveryState, limit: number): Promise<string[]>;
  markSending(input: MarkSendingInput): Promise<number>;
  markAcked(input: MarkAckedInput): Promise<number>;
  revertSendingToPending(input: RevertSendingInput): Promise<number>;
  moveToQuarantine(input: QuarantineInput[]): Promise<number>;
  compactAckedRows(limit: number): Promise<number>;
  writeSettingsSnapshot(snapshot: SettingsSnapshotRow): Promise<void>;
  readSettingsSnapshot(snapshotKey?: string): Promise<SettingsSnapshotRow | null>;
  writeSyncState(state: SyncStateRow): Promise<void>;
  readSyncState(stateKey: string): Promise<SyncStateRow | null>;
  getStats(): Promise<OutboxStorageStats>;
  estimateOutboxSizeBytes(): Promise<number>;
  close(): Promise<void>;
};

export type StorageMigrationStatus = {
  currentVersion: number;
  appliedVersions: number[];
};

export type OutboxPathOptions = {
  context: vscode.ExtensionContext;
  fileName?: string;
};
