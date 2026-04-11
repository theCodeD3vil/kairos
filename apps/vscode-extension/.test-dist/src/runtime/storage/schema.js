"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listMigrations = listMigrations;
exports.latestSchemaVersion = latestSchemaVersion;
const types_1 = require("./types");
const migrations = [
    {
        version: 1,
        statements: [
            `
        CREATE TABLE IF NOT EXISTS outbox_events (
          event_id TEXT PRIMARY KEY,
          occurred_at TEXT NOT NULL,
          recorded_at TEXT NOT NULL,
          event_type TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          workspace_id TEXT NULL,
          workspace_name TEXT NULL,
          project_id_hint TEXT NULL,
          language TEXT NULL,
          machine_id TEXT NOT NULL,
          installation_id TEXT NOT NULL,
          schema_version INTEGER NOT NULL,
          delivery_state TEXT NOT NULL DEFAULT 'pending',
          attempt_count INTEGER NOT NULL DEFAULT 0,
          last_attempt_at TEXT NULL,
          last_error_code TEXT NULL,
          last_error_message TEXT NULL,
          last_batch_id TEXT NULL,
          acked_at TEXT NULL
        )
      `,
            `
        CREATE TABLE IF NOT EXISTS quarantine_events (
          event_id TEXT PRIMARY KEY,
          quarantined_at TEXT NOT NULL,
          rejection_code TEXT NOT NULL,
          rejection_message TEXT NULL,
          payload_json TEXT NOT NULL,
          original_occurred_at TEXT NOT NULL,
          schema_version INTEGER NOT NULL,
          machine_id TEXT NOT NULL,
          installation_id TEXT NOT NULL
        )
      `,
            `
        CREATE TABLE IF NOT EXISTS settings_snapshot (
          snapshot_key TEXT PRIMARY KEY,
          version TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          source_instance_id TEXT NULL,
          fetched_at TEXT NOT NULL
        )
      `,
            `
        CREATE TABLE IF NOT EXISTS sync_state (
          state_key TEXT PRIMARY KEY,
          value_json TEXT NOT NULL
        )
      `,
        ],
    },
];
function listMigrations() {
    return [...migrations];
}
function latestSchemaVersion() {
    return types_1.OUTBOX_SCHEMA_VERSION;
}
//# sourceMappingURL=schema.js.map