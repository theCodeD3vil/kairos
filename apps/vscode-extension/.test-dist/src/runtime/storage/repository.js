"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openOutboxStorage = openOutboxStorage;
exports.getOutboxStorageMigrationStatus = getOutboxStorageMigrationStatus;
const database_1 = require("./database");
const types_1 = require("./types");
async function openOutboxStorage(options) {
    const db = await database_1.OutboxDatabase.open(options);
    return new SqlOutboxRepository(db);
}
async function getOutboxStorageMigrationStatus(options) {
    const db = await database_1.OutboxDatabase.open(options);
    try {
        return await db.migrationStatus();
    }
    finally {
        await db.close();
    }
}
class SqlOutboxRepository {
    db;
    constructor(db) {
        this.db = db;
    }
    async enqueueEvent(event) {
        await this.db.withTransaction(() => {
            this.db.execute(`
          INSERT INTO outbox_events (
            event_id, occurred_at, recorded_at, event_type, payload_json,
            workspace_id, workspace_name, project_id_hint, language,
            machine_id, installation_id, schema_version
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
                event.eventId,
                event.occurredAt,
                event.recordedAt,
                event.eventType,
                event.payloadJson,
                event.workspaceId ?? null,
                event.workspaceName ?? null,
                event.projectIdHint ?? null,
                event.language ?? null,
                event.machineId,
                event.installationId,
                event.schemaVersion,
            ]);
        });
    }
    async fetchPendingBatch(limit) {
        if (!Number.isFinite(limit) || limit <= 0) {
            return [];
        }
        const rows = this.db.query(`
        SELECT
          event_id, occurred_at, recorded_at, event_type, payload_json,
          workspace_id, workspace_name, project_id_hint, language,
          machine_id, installation_id, schema_version, delivery_state,
          attempt_count, last_attempt_at, last_error_code, last_error_message,
          last_batch_id, acked_at
        FROM outbox_events
        WHERE delivery_state = 'pending'
        ORDER BY occurred_at ASC, event_id ASC
        LIMIT ?
      `, [Math.floor(limit)]);
        return rows.map(mapOutboxEventRow);
    }
    async listEventIDsByState(state, limit) {
        if (!Number.isFinite(limit) || limit <= 0) {
            return [];
        }
        const rows = this.db.query(`
        SELECT event_id
        FROM outbox_events
        WHERE delivery_state = ?
        ORDER BY occurred_at ASC, event_id ASC
        LIMIT ?
      `, [state, Math.floor(limit)]);
        return rows.map((row) => toStringField(row.event_id, 'event_id'));
    }
    async markSending(input) {
        if (input.eventIds.length === 0) {
            return 0;
        }
        return this.db.withTransaction(() => {
            this.db.execute(`
          UPDATE outbox_events
          SET
            delivery_state = 'sending',
            attempt_count = attempt_count + 1,
            last_attempt_at = ?,
            last_error_code = NULL,
            last_error_message = NULL,
            last_batch_id = ?
          WHERE delivery_state = 'pending' AND event_id IN (${buildPlaceholders(input.eventIds.length)})
        `, [input.attemptedAt, input.batchId, ...input.eventIds]);
            return this.db.rowsModified();
        });
    }
    async markAcked(input) {
        if (input.eventIds.length === 0) {
            return 0;
        }
        return this.db.withTransaction(() => {
            this.db.execute(`
          UPDATE outbox_events
          SET
            delivery_state = 'acked',
            acked_at = ?,
            last_error_code = NULL,
            last_error_message = NULL
          WHERE event_id IN (${buildPlaceholders(input.eventIds.length)})
        `, [input.ackedAt, ...input.eventIds]);
            return this.db.rowsModified();
        });
    }
    async revertSendingToPending(input) {
        if (input.eventIds.length === 0) {
            return 0;
        }
        return this.db.withTransaction(() => {
            this.db.execute(`
          UPDATE outbox_events
          SET
            delivery_state = 'pending',
            last_error_code = ?,
            last_error_message = ?,
            last_batch_id = NULL
          WHERE delivery_state = 'sending' AND event_id IN (${buildPlaceholders(input.eventIds.length)})
        `, [input.errorCode ?? null, input.errorMessage ?? null, ...input.eventIds]);
            return this.db.rowsModified();
        });
    }
    async moveToQuarantine(input) {
        if (input.length === 0) {
            return 0;
        }
        return this.db.withTransaction(() => {
            let moved = 0;
            for (const item of input) {
                const eventRows = this.db.query(`
            SELECT
              event_id, payload_json, occurred_at, schema_version, machine_id, installation_id
            FROM outbox_events
            WHERE event_id = ?
          `, [item.eventId]);
                if (eventRows.length === 0) {
                    continue;
                }
                const event = eventRows[0];
                this.db.execute(`
            INSERT OR REPLACE INTO quarantine_events (
              event_id, quarantined_at, rejection_code, rejection_message,
              payload_json, original_occurred_at, schema_version,
              machine_id, installation_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
                    item.eventId,
                    item.quarantinedAt,
                    item.rejectionCode,
                    item.rejectionMessage ?? null,
                    toStringField(event.payload_json, 'payload_json'),
                    toStringField(event.occurred_at, 'occurred_at'),
                    toNumberField(event.schema_version, 'schema_version'),
                    toStringField(event.machine_id, 'machine_id'),
                    toStringField(event.installation_id, 'installation_id'),
                ]);
                this.db.execute(`DELETE FROM outbox_events WHERE event_id = ?`, [item.eventId]);
                moved += this.db.rowsModified();
            }
            return moved;
        });
    }
    async compactAckedRows(limit) {
        if (!Number.isFinite(limit) || limit <= 0) {
            return 0;
        }
        return this.db.withTransaction(() => {
            this.db.execute(`
          DELETE FROM outbox_events
          WHERE event_id IN (
            SELECT event_id
            FROM outbox_events
            WHERE delivery_state = 'acked'
            ORDER BY acked_at ASC, event_id ASC
            LIMIT ?
          )
        `, [Math.floor(limit)]);
            return this.db.rowsModified();
        });
    }
    async writeSettingsSnapshot(snapshot) {
        await this.db.withTransaction(() => {
            this.db.execute(`
          INSERT INTO settings_snapshot (
            snapshot_key, version, updated_at, payload_json, source_instance_id, fetched_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(snapshot_key) DO UPDATE SET
            version = excluded.version,
            updated_at = excluded.updated_at,
            payload_json = excluded.payload_json,
            source_instance_id = excluded.source_instance_id,
            fetched_at = excluded.fetched_at
        `, [
                snapshot.snapshotKey,
                snapshot.version,
                snapshot.updatedAt,
                snapshot.payloadJson,
                snapshot.sourceInstanceId ?? null,
                snapshot.fetchedAt,
            ]);
        });
    }
    async readSettingsSnapshot(snapshotKey = types_1.SETTINGS_SNAPSHOT_DEFAULT_KEY) {
        const rows = this.db.query(`
        SELECT snapshot_key, version, updated_at, payload_json, source_instance_id, fetched_at
        FROM settings_snapshot
        WHERE snapshot_key = ?
      `, [snapshotKey]);
        if (rows.length === 0) {
            return null;
        }
        const row = rows[0];
        return {
            snapshotKey: toStringField(row.snapshot_key, 'snapshot_key'),
            version: toStringField(row.version, 'version'),
            updatedAt: toStringField(row.updated_at, 'updated_at'),
            payloadJson: toStringField(row.payload_json, 'payload_json'),
            sourceInstanceId: toNullableStringField(row.source_instance_id),
            fetchedAt: toStringField(row.fetched_at, 'fetched_at'),
        };
    }
    async writeSyncState(state) {
        await this.db.withTransaction(() => {
            this.db.execute(`
          INSERT INTO sync_state (state_key, value_json)
          VALUES (?, ?)
          ON CONFLICT(state_key) DO UPDATE SET
            value_json = excluded.value_json
        `, [state.stateKey, state.valueJson]);
        });
    }
    async readSyncState(stateKey) {
        const rows = this.db.query(`
        SELECT state_key, value_json
        FROM sync_state
        WHERE state_key = ?
      `, [stateKey]);
        if (rows.length === 0) {
            return null;
        }
        const row = rows[0];
        return {
            stateKey: toStringField(row.state_key, 'state_key'),
            valueJson: toStringField(row.value_json, 'value_json'),
        };
    }
    async getStats() {
        const pending = this.db.query(`SELECT COUNT(*) AS count FROM outbox_events WHERE delivery_state = 'pending'`);
        const sending = this.db.query(`SELECT COUNT(*) AS count FROM outbox_events WHERE delivery_state = 'sending'`);
        const acked = this.db.query(`SELECT COUNT(*) AS count FROM outbox_events WHERE delivery_state = 'acked'`);
        const quarantined = this.db.query(`SELECT COUNT(*) AS count FROM quarantine_events`);
        return {
            pendingCount: toNumberField(pending[0]?.count ?? 0, 'pendingCount'),
            sendingCount: toNumberField(sending[0]?.count ?? 0, 'sendingCount'),
            ackedCount: toNumberField(acked[0]?.count ?? 0, 'ackedCount'),
            quarantineCount: toNumberField(quarantined[0]?.count ?? 0, 'quarantineCount'),
        };
    }
    async estimateOutboxSizeBytes() {
        const rows = this.db.query(`
        SELECT COALESCE(SUM(
          LENGTH(event_id) +
          LENGTH(occurred_at) +
          LENGTH(recorded_at) +
          LENGTH(event_type) +
          LENGTH(payload_json) +
          COALESCE(LENGTH(workspace_id), 0) +
          COALESCE(LENGTH(workspace_name), 0) +
          COALESCE(LENGTH(project_id_hint), 0) +
          COALESCE(LENGTH(language), 0) +
          LENGTH(machine_id) +
          LENGTH(installation_id)
        ), 0) AS size_bytes
        FROM outbox_events
        WHERE delivery_state IN ('pending', 'sending')
      `);
        return toNumberField(rows[0]?.size_bytes ?? 0, 'size_bytes');
    }
    async close() {
        await this.db.close();
    }
}
function mapOutboxEventRow(row) {
    return {
        eventId: toStringField(row.event_id, 'event_id'),
        occurredAt: toStringField(row.occurred_at, 'occurred_at'),
        recordedAt: toStringField(row.recorded_at, 'recorded_at'),
        eventType: toStringField(row.event_type, 'event_type'),
        payloadJson: toStringField(row.payload_json, 'payload_json'),
        workspaceId: toNullableStringField(row.workspace_id),
        workspaceName: toNullableStringField(row.workspace_name),
        projectIdHint: toNullableStringField(row.project_id_hint),
        language: toNullableStringField(row.language),
        machineId: toStringField(row.machine_id, 'machine_id'),
        installationId: toStringField(row.installation_id, 'installation_id'),
        schemaVersion: toNumberField(row.schema_version, 'schema_version'),
        deliveryState: toDeliveryState(row.delivery_state),
        attemptCount: toNumberField(row.attempt_count, 'attempt_count'),
        lastAttemptAt: toNullableStringField(row.last_attempt_at),
        lastErrorCode: toNullableStringField(row.last_error_code),
        lastErrorMessage: toNullableStringField(row.last_error_message),
        lastBatchId: toNullableStringField(row.last_batch_id),
        ackedAt: toNullableStringField(row.acked_at),
    };
}
function toDeliveryState(value) {
    if (value === 'pending' || value === 'sending' || value === 'acked') {
        return value;
    }
    throw new Error(`invalid delivery_state value: ${String(value)}`);
}
function toStringField(value, field) {
    if (typeof value === 'string') {
        return value;
    }
    throw new Error(`invalid string value for ${field}`);
}
function toNullableStringField(value) {
    if (value === null) {
        return null;
    }
    if (typeof value === 'string') {
        return value;
    }
    return String(value);
}
function toNumberField(value, field) {
    if (typeof value === 'number') {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed)) {
            return parsed;
        }
    }
    throw new Error(`invalid numeric value for ${field}`);
}
function buildPlaceholders(length) {
    return Array.from({ length }, () => '?').join(', ');
}
//# sourceMappingURL=repository.js.map