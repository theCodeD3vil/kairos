import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import initSqlJs from 'sql.js';
import type { SqlJsDatabase, SqlJsStatic } from 'sql.js';

import {
  OUTBOX_DATABASE_FILE_NAME,
  OUTBOX_SCHEMA_VERSION,
  getOutboxStorageMigrationStatus,
  openOutboxStorage,
  resolveOutboxDatabasePath,
  SETTINGS_SNAPSHOT_DEFAULT_KEY,
  type OutboxEventInput,
  type SettingsSnapshotRow,
} from '../src/runtime/storage';

const SQL_WASM_PATH = require.resolve('sql.js/dist/sql-wasm.wasm');

test('resolves outbox database path from extension global storage URI', () => {
  const dbPath = resolveOutboxDatabasePath({
    context: {
      globalStorageUri: { fsPath: '/tmp/kairos-global-storage' },
    } as never,
  });

  assert.equal(dbPath, path.join('/tmp/kairos-global-storage', OUTBOX_DATABASE_FILE_NAME));
});

test('initializes outbox schema and migration state', async () => {
  const harness = await createHarness();
  const store = await openOutboxStorage({ databasePath: harness.dbPath });

  try {
    const status = await getOutboxStorageMigrationStatus({ databasePath: harness.dbPath });
    assert.equal(status.currentVersion, OUTBOX_SCHEMA_VERSION);
    assert.deepEqual(status.appliedVersions, [OUTBOX_SCHEMA_VERSION]);

    const tables = await selectRows(
      harness.dbPath,
      `SELECT name FROM sqlite_master WHERE type='table' ORDER BY name ASC`,
    );
    assert.deepEqual(
      tables.map((row) => row.name),
      ['outbox_events', 'quarantine_events', 'schema_migrations', 'settings_snapshot', 'sync_state'],
    );

    assert.deepEqual(await readColumnNames(harness.dbPath, 'outbox_events'), [
      'event_id',
      'occurred_at',
      'recorded_at',
      'event_type',
      'payload_json',
      'workspace_id',
      'workspace_name',
      'project_id_hint',
      'language',
      'machine_id',
      'installation_id',
      'schema_version',
      'delivery_state',
      'attempt_count',
      'last_attempt_at',
      'last_error_code',
      'last_error_message',
      'last_batch_id',
      'acked_at',
    ]);
    assert.deepEqual(await readColumnNames(harness.dbPath, 'quarantine_events'), [
      'event_id',
      'quarantined_at',
      'rejection_code',
      'rejection_message',
      'payload_json',
      'original_occurred_at',
      'schema_version',
      'machine_id',
      'installation_id',
    ]);
    assert.deepEqual(await readColumnNames(harness.dbPath, 'settings_snapshot'), [
      'snapshot_key',
      'version',
      'updated_at',
      'payload_json',
      'source_instance_id',
      'fetched_at',
    ]);
    assert.deepEqual(await readColumnNames(harness.dbPath, 'sync_state'), ['state_key', 'value_json']);
  } finally {
    await store.close();
    harness.cleanup();
  }
});

test('re-open is idempotent and newer schema version is rejected', async () => {
  const harness = await createHarness();
  const first = await openOutboxStorage({ databasePath: harness.dbPath });
  await first.close();

  const second = await openOutboxStorage({ databasePath: harness.dbPath });
  await second.close();

  const rawDb = await createRawDatabase();
  rawDb.run(`
    CREATE TABLE schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);
  rawDb.run(`INSERT INTO schema_migrations (version, applied_at) VALUES (99, '2026-04-09T12:00:00Z')`);
  await writeRawDatabase(harness.dbPath, rawDb);

  await assert.rejects(
    () => openOutboxStorage({ databasePath: harness.dbPath }),
    /schema version 99 is newer than supported version/,
  );
  harness.cleanup();
});

test('enqueue and fetch pending batch returns ordered pending events', async () => {
  const harness = await createHarness();
  const store = await openOutboxStorage({ databasePath: harness.dbPath });

  try {
    await store.enqueueEvent(createEvent({ eventId: 'evt-2', occurredAt: '2026-04-09T12:02:00Z' }));
    await store.enqueueEvent(createEvent({ eventId: 'evt-1', occurredAt: '2026-04-09T12:01:00Z' }));

    const pending = await store.fetchPendingBatch(10);
    assert.equal(pending.length, 2);
    assert.equal(pending[0].eventId, 'evt-1');
    assert.equal(pending[0].deliveryState, 'pending');
    assert.equal(pending[1].eventId, 'evt-2');
  } finally {
    await store.close();
    harness.cleanup();
  }
});

test('mark sending and mark acked transitions update row state', async () => {
  const harness = await createHarness();
  const store = await openOutboxStorage({ databasePath: harness.dbPath });

  try {
    await store.enqueueEvent(createEvent({ eventId: 'evt-1' }));
    const sendingCount = await store.markSending({
      eventIds: ['evt-1'],
      attemptedAt: '2026-04-09T12:05:00Z',
      batchId: 'batch-1',
    });
    assert.equal(sendingCount, 1);

    let rows = await selectRows(
      harness.dbPath,
      `SELECT delivery_state, attempt_count, last_attempt_at, last_batch_id FROM outbox_events WHERE event_id = 'evt-1'`,
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0].delivery_state, 'sending');
    assert.equal(rows[0].attempt_count, 1);
    assert.equal(rows[0].last_attempt_at, '2026-04-09T12:05:00Z');
    assert.equal(rows[0].last_batch_id, 'batch-1');

    const ackedCount = await store.markAcked({
      eventIds: ['evt-1'],
      ackedAt: '2026-04-09T12:06:00Z',
    });
    assert.equal(ackedCount, 1);

    rows = await selectRows(
      harness.dbPath,
      `SELECT delivery_state, acked_at FROM outbox_events WHERE event_id = 'evt-1'`,
    );
    assert.equal(rows[0].delivery_state, 'acked');
    assert.equal(rows[0].acked_at, '2026-04-09T12:06:00Z');
  } finally {
    await store.close();
    harness.cleanup();
  }
});

test('revert sending to pending restores pending state and records last error', async () => {
  const harness = await createHarness();
  const store = await openOutboxStorage({ databasePath: harness.dbPath });

  try {
    await store.enqueueEvent(createEvent({ eventId: 'evt-1' }));
    await store.markSending({
      eventIds: ['evt-1'],
      attemptedAt: '2026-04-09T12:05:00Z',
      batchId: 'batch-1',
    });

    const reverted = await store.revertSendingToPending({
      eventIds: ['evt-1'],
      errorCode: 'request_failed_ambiguous',
      errorMessage: 'desktop unavailable',
    });
    assert.equal(reverted, 1);

    const rows = await selectRows(
      harness.dbPath,
      `SELECT delivery_state, last_error_code, last_error_message, last_batch_id FROM outbox_events WHERE event_id = 'evt-1'`,
    );
    assert.equal(rows[0].delivery_state, 'pending');
    assert.equal(rows[0].last_error_code, 'request_failed_ambiguous');
    assert.equal(rows[0].last_error_message, 'desktop unavailable');
    assert.equal(rows[0].last_batch_id, null);
  } finally {
    await store.close();
    harness.cleanup();
  }
});

test('move to quarantine inserts quarantine row and removes outbox row', async () => {
  const harness = await createHarness();
  const store = await openOutboxStorage({ databasePath: harness.dbPath });

  try {
    await store.enqueueEvent(
      createEvent({
        eventId: 'evt-1',
        occurredAt: '2026-04-09T12:01:00Z',
        payloadJson: '{"kind":"event"}',
      }),
    );

    const moved = await store.moveToQuarantine([
      {
        eventId: 'evt-1',
        rejectionCode: 'invalid_payload',
        rejectionMessage: 'bad payload',
        quarantinedAt: '2026-04-09T12:09:00Z',
      },
    ]);
    assert.equal(moved, 1);

    const outboxRows = await selectRows(harness.dbPath, `SELECT event_id FROM outbox_events WHERE event_id = 'evt-1'`);
    assert.equal(outboxRows.length, 0);

    const quarantineRows = await selectRows(
      harness.dbPath,
      `
        SELECT event_id, rejection_code, rejection_message, payload_json, original_occurred_at
        FROM quarantine_events
        WHERE event_id = 'evt-1'
      `,
    );
    assert.equal(quarantineRows.length, 1);
    assert.equal(quarantineRows[0].rejection_code, 'invalid_payload');
    assert.equal(quarantineRows[0].rejection_message, 'bad payload');
    assert.equal(quarantineRows[0].payload_json, '{"kind":"event"}');
    assert.equal(quarantineRows[0].original_occurred_at, '2026-04-09T12:01:00Z');
  } finally {
    await store.close();
    harness.cleanup();
  }
});

test('settings snapshot read/write upserts by snapshot key', async () => {
  const harness = await createHarness();
  const store = await openOutboxStorage({ databasePath: harness.dbPath });

  try {
    const empty = await store.readSettingsSnapshot();
    assert.equal(empty, null);

    const firstSnapshot: SettingsSnapshotRow = {
      snapshotKey: SETTINGS_SNAPSHOT_DEFAULT_KEY,
      version: 'v1',
      updatedAt: '2026-04-09T12:00:00Z',
      payloadJson: '{"trackingEnabled":true}',
      sourceInstanceId: 'desktop-instance-1',
      fetchedAt: '2026-04-09T12:01:00Z',
    };
    await store.writeSettingsSnapshot(firstSnapshot);

    const updatedSnapshot: SettingsSnapshotRow = {
      ...firstSnapshot,
      version: 'v2',
      payloadJson: '{"trackingEnabled":false}',
      fetchedAt: '2026-04-09T12:02:00Z',
    };
    await store.writeSettingsSnapshot(updatedSnapshot);

    const readBack = await store.readSettingsSnapshot();
    assert.deepEqual(readBack, updatedSnapshot);
  } finally {
    await store.close();
    harness.cleanup();
  }
});

test('sync state read/write upserts by state key', async () => {
  const harness = await createHarness();
  const store = await openOutboxStorage({ databasePath: harness.dbPath });

  try {
    const empty = await store.readSyncState('worker_state');
    assert.equal(empty, null);

    await store.writeSyncState({ stateKey: 'worker_state', valueJson: '{"cursor":"a"}' });
    await store.writeSyncState({ stateKey: 'worker_state', valueJson: '{"cursor":"b"}' });

    const readBack = await store.readSyncState('worker_state');
    assert.deepEqual(readBack, { stateKey: 'worker_state', valueJson: '{"cursor":"b"}' });
  } finally {
    await store.close();
    harness.cleanup();
  }
});

test('acked compaction deletes rows in bounded chunks', async () => {
  const harness = await createHarness();
  const store = await openOutboxStorage({ databasePath: harness.dbPath });

  try {
    await store.enqueueEvent(createEvent({ eventId: 'evt-1' }));
    await store.enqueueEvent(createEvent({ eventId: 'evt-2' }));
    await store.enqueueEvent(createEvent({ eventId: 'evt-3' }));

    await store.markAcked({ eventIds: ['evt-1'], ackedAt: '2026-04-09T12:01:00Z' });
    await store.markAcked({ eventIds: ['evt-2'], ackedAt: '2026-04-09T12:02:00Z' });
    await store.markAcked({ eventIds: ['evt-3'], ackedAt: '2026-04-09T12:03:00Z' });

    const deleted = await store.compactAckedRows(2);
    assert.equal(deleted, 2);

    const rows = await selectRows(
      harness.dbPath,
      `SELECT event_id FROM outbox_events ORDER BY event_id ASC`,
    );
    assert.deepEqual(rows.map((row) => row.event_id), ['evt-3']);
  } finally {
    await store.close();
    harness.cleanup();
  }
});

test('outbox size estimate counts pending and sending rows only', async () => {
  const harness = await createHarness();
  const store = await openOutboxStorage({ databasePath: harness.dbPath });

  try {
    await store.enqueueEvent(createEvent({ eventId: 'evt-1', payloadJson: '{"id":"evt-1","kind":"pending"}' }));
    await store.enqueueEvent(createEvent({ eventId: 'evt-2', payloadJson: '{"id":"evt-2","kind":"sending"}' }));
    await store.enqueueEvent(createEvent({ eventId: 'evt-3', payloadJson: '{"id":"evt-3","kind":"acked"}' }));
    await store.markSending({
      eventIds: ['evt-2'],
      attemptedAt: '2026-04-09T12:05:00Z',
      batchId: 'batch-1',
    });
    await store.markAcked({
      eventIds: ['evt-3'],
      ackedAt: '2026-04-09T12:06:00Z',
    });

    const estimatedBytes = await store.estimateOutboxSizeBytes();
    const expectedBytes = '{"id":"evt-1","kind":"pending"}'.length + '{"id":"evt-2","kind":"sending"}'.length;
    assert.equal(estimatedBytes >= expectedBytes, true);
  } finally {
    await store.close();
    harness.cleanup();
  }
});

async function createHarness(): Promise<{ dbPath: string; cleanup: () => void }> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kairos-outbox-test-'));
  return {
    dbPath: path.join(tempDir, OUTBOX_DATABASE_FILE_NAME),
    cleanup() {
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

function createEvent(overrides: Partial<OutboxEventInput> = {}): OutboxEventInput {
  const eventID = overrides.eventId ?? 'evt-1';
  return {
    eventId: eventID,
    occurredAt: overrides.occurredAt ?? '2026-04-09T12:00:00Z',
    recordedAt: overrides.recordedAt ?? '2026-04-09T12:00:01Z',
    eventType: overrides.eventType ?? 'edit',
    payloadJson: overrides.payloadJson ?? `{"id":"${eventID}"}`,
    workspaceId: overrides.workspaceId ?? 'workspace-1',
    workspaceName: overrides.workspaceName ?? 'kairos',
    projectIdHint: overrides.projectIdHint ?? 'project-1',
    language: overrides.language ?? 'typescript',
    machineId: overrides.machineId ?? 'machine-1',
    installationId: overrides.installationId ?? 'installation-1',
    schemaVersion: overrides.schemaVersion ?? 1,
  };
}

async function readColumnNames(dbPath: string, tableName: string): Promise<string[]> {
  const rows = await selectRows(dbPath, `PRAGMA table_info(${tableName})`);
  return rows.map((row) => String(row.name));
}

async function selectRows(
  dbPath: string,
  sql: string,
): Promise<Array<Record<string, string | number | null>>> {
  const db = await readRawDatabase(dbPath);
  try {
    return queryAll(db, sql);
  } finally {
    db.close();
  }
}

async function readRawDatabase(dbPath: string): Promise<SqlJsDatabase> {
  const sqlStatic = await loadSqlStatic();
  const raw = await fs.promises.readFile(dbPath);
  const bytes = new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
  return new sqlStatic.Database(bytes);
}

async function writeRawDatabase(dbPath: string, db: SqlJsDatabase): Promise<void> {
  const bytes = db.export();
  await fs.promises.writeFile(dbPath, Buffer.from(bytes));
  db.close();
}

function queryAll(
  db: SqlJsDatabase,
  sql: string,
): Array<Record<string, string | number | null>> {
  const statement = db.prepare(sql);
  try {
    const rows: Array<Record<string, string | number | null>> = [];
    while (statement.step()) {
      rows.push(statement.getAsObject());
    }
    return rows;
  } finally {
    statement.free();
  }
}

async function createRawDatabase(): Promise<SqlJsDatabase> {
  const sqlStatic = await loadSqlStatic();
  return new sqlStatic.Database();
}

let cachedSqlStatic: SqlJsStatic | null = null;

async function loadSqlStatic(): Promise<SqlJsStatic> {
  if (cachedSqlStatic) {
    return cachedSqlStatic;
  }
  cachedSqlStatic = await initSqlJs({ locateFile: () => SQL_WASM_PATH });
  return cachedSqlStatic;
}
