# Cloud Sync (BYO Database)

**Status:** Draft — design spec. Not yet implemented.

## Overview

Cloud sync lets users keep multiple Kairos installations consistent by pointing each desktop client at a Postgres database they own and host themselves. Anthropic/Kairos never sees the data: it lives in the user's infrastructure (Supabase, Neon, RDS, Railway, self-hosted, etc.). The cloud database is **permanent storage**, not a transit buffer — it is a durable source of truth for cross-machine data.

The local SQLite database remains the source of truth for the UI. Cloud sync runs as a background process that pushes local changes outward and pulls remote changes inward asynchronously. The app stays fully functional when the cloud DB is unreachable.

## Goals

- Users own their data; we never host it.
- Multi-machine consistency without breaking the local-first posture.
- Privacy-respecting defaults (hashed file paths to cloud unless user opts in).
- Forward-only schema evolution against user-owned Postgres.
- Failure tolerance: outages, auth issues, schema skew, quota limits.

## Non-goals (v1)

- Multi-tenant / team sharing. One DB = one user, many machines.
- Client-side encryption. Would break server-side queryability; future work.
- Web dashboard.
- Engines other than Postgres. libSQL/Turso may follow in v2.
- Cloud-aware analytics rollups. Analytics stays local-only.

## Architecture

```
┌──────────────────────────┐         ┌──────────────────────────┐
│  Desktop A (Mac)         │         │  Desktop B (Linux)       │
│  ┌────────────────────┐  │         │  ┌────────────────────┐  │
│  │ Local SQLite       │  │         │  │ Local SQLite       │  │
│  │   + cloud_outbox   │  │         │  │   + cloud_outbox   │  │
│  │   + cloud_cursor   │  │         │  │   + cloud_cursor   │  │
│  └─────────┬──────────┘  │         │  └─────────┬──────────┘  │
│            │             │         │            │             │
│   ┌────────▼──────────┐  │         │   ┌────────▼──────────┐  │
│   │ cloudsync worker  │  │         │   │ cloudsync worker  │  │
│   └────────┬──────────┘  │         │   └────────┬──────────┘  │
└────────────┼─────────────┘         └────────────┼─────────────┘
             │                                    │
             │ Postgres TLS                       │
             └──────────────┬─────────────────────┘
                            │
                ┌───────────▼────────────┐
                │  User-owned Postgres   │
                │  - events              │
                │  - sessions            │
                │  - settings_sections   │
                │  - kairos_machines     │
                │  - kairos_*            │
                └────────────────────────┘
```

- The local SQLite store is unchanged in shape. Sync columns (`updated_at`, `deleted_at`, `origin_machine_id`, `row_version`) are added to synced tables.
- A new package `apps/desktop/internal/cloudsync/` owns connection, migration, push, pull, and reconciliation.
- The VS Code extension does not talk to the cloud DB directly — it writes only to the local desktop. Sync is the desktop's job.

## Locked-in decisions

| Concern | Choice |
|---|---|
| DB engine v1 | Postgres 14+ only, TLS required |
| Credential model | One DSN required + optional admin DSN for init/migrate |
| Sessionization | Re-derive locally on union, incremental by `(machine_id, date)`; remote `sessions` is cache for joiners |
| Settings conflict | Per-section last-write-wins on `updated_at` |
| Sync trigger | 60s timer + on-focus + on-settings-change, debounced 15s. Interval configurable 30–300s |
| Tombstone retention | 30 days default, configurable; daily hard-delete sweep |
| Join backfill | Full backfill by default; opt-in "sync from now" toggle |
| PII default | Hashed file paths to cloud regardless of local mode; opt-in full-path-to-cloud toggle |

## Schema

### Remote (Postgres)

Control tables:

```sql
CREATE TABLE kairos_cloud_meta (
    cloud_id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by_machine TEXT NOT NULL,
    path_hash_salt TEXT NOT NULL  -- shared salt so all machines hash identically
);

CREATE TABLE kairos_schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    applied_by_machine TEXT NOT NULL
);

CREATE TABLE kairos_machines (
    machine_id TEXT PRIMARY KEY,
    name TEXT,
    last_seen_at TIMESTAMPTZ NOT NULL,
    client_schema_version INTEGER NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Data tables follow this shape (events shown; sessions and settings_sections mirror the pattern):

```sql
CREATE TABLE events (
    id UUID PRIMARY KEY,
    machine_id TEXT NOT NULL,
    extension_id TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL,
    -- existing event fields mirrored from local schema --

    -- sync columns:
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ NULL,
    origin_machine_id TEXT NOT NULL,
    row_version BIGINT NOT NULL
);
CREATE INDEX events_updated_at_idx ON events (updated_at);
CREATE INDEX events_machine_occurred_idx ON events (machine_id, occurred_at);

CREATE TABLE settings_sections (
    section TEXT PRIMARY KEY,     -- 'general', 'privacy', 'tracking', 'exclusions', 'appBehavior'
    payload JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    origin_machine_id TEXT NOT NULL,
    row_version BIGINT NOT NULL
);
```

### Local additions (SQLite)

```sql
CREATE TABLE cloud_outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    row_id TEXT NOT NULL,
    op TEXT NOT NULL CHECK (op IN ('upsert','delete')),
    payload BLOB NOT NULL,         -- masked JSON
    enqueued_at INTEGER NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT
);
CREATE INDEX cloud_outbox_enq_idx ON cloud_outbox (enqueued_at);

CREATE TABLE cloud_cursor (
    table_name TEXT PRIMARY KEY,
    last_updated_at INTEGER NOT NULL,
    last_pulled_at INTEGER NOT NULL
);

CREATE TABLE cloud_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
-- Keys: cloud_id, schema_version, sync_enabled, interval_seconds,
--       full_paths_to_cloud, path_hash_salt
```

### Settings sync inclusion matrix

| Section | Synced? | Reason |
|---|---|---|
| `general` | Yes | Consistent UX across machines |
| `privacy` | Yes | Should match across machines |
| `tracking` | Yes | Same |
| `exclusions` | Yes | Same |
| `appBehavior` | Yes | Same |
| `extension` | No | Per-machine bridge token |
| `cloudSync` (new) | No | Chicken-and-egg; per-machine |

## Sync engine

### Outbox enqueue

Every successful write to a sync-eligible table also writes a row to `cloud_outbox` with the masked payload. The hook lives in `storage/` immediately after the existing transaction commits. If sync is disabled the hook is a noop.

### Push worker

```
trigger: 60s timer | window focus | settings change
debounce: 15s minimum between pushes

loop:
  rows = SELECT FROM cloud_outbox ORDER BY enqueued_at LIMIT 500
  if rows.empty: return
  open remote tx:
    for each row:
      apply mask(payload, cloud_config)
      execute upsert / delete on target table
    UPDATE kairos_machines SET last_seen_at = NOW() WHERE machine_id = self
  commit
  DELETE FROM cloud_outbox WHERE id IN (success_ids)
  on error:
    increment attempt_count for failed rows
    exponential backoff: 30s, 60s, 2m, 5m, 15m
    after 5 failures: surface in UI status
```

### Pull worker

```
trigger: 60s timer | window focus

for table in [events, sessions, settings_sections, kairos_machines]:
  cursor = SELECT last_updated_at FROM cloud_cursor WHERE table_name = ?
  rows = SELECT FROM <table>
         WHERE updated_at > cursor AND origin_machine_id != self
         ORDER BY updated_at
         LIMIT 500
  for row in rows:
    UPSERT into local SQLite by primary key
  UPDATE cloud_cursor SET last_updated_at = max(updated_at)

if any new events arrived:
  enqueue reconcile job for each affected (machine_id, date)
```

### Reconciliation

For each `(machine_id, date)` tuple touched by pulled events:

1. Read all events for that scope from local SQLite.
2. Re-run sessionization (split + merge) on that scope only.
3. Replace local `sessions` rows in that scope with the result.
4. Enqueue the new session rows into `cloud_outbox` so the remote cache stays warm.

Incremental reconciliation is new code. Existing local sessionization remains the single source of logic — only the scope is narrowed. A shadow mode runs full + incremental side by side in early releases and warns on divergence.

## Conflict resolution

| Table | Strategy |
|---|---|
| `events` | Append-only, immutable, partitioned by `machine_id` — no conflict possible |
| `sessions` | Derived per-machine; re-computed deterministically — remote cache, local truth |
| `settings_sections` | LWW on `updated_at` per section |
| `kairos_machines` | Each row owned by its own machine; no cross-write |

The LWW edge case — two machines edit the same settings section while both offline — results in the later `updated_at` winning when sync resumes. Acceptable: settings are small, infrequently changed, and the loser can re-edit.

## Privacy and masking

Masking runs at push time. The local DB stores full data per `privacy.filePathMode`; the cloud receives masked data per `cloud_config.full_paths_to_cloud`.

```
mask(row, config):
  if not config.full_paths_to_cloud:
    row.file_path = HMAC-SHA256(config.path_hash_salt, row.file_path)
  return row
```

The salt lives in `kairos_cloud_meta.path_hash_salt` and is read by every machine on join. Same paths across machines hash identically, so projects still group correctly across the fleet.

The cloud overlay is always at least as strict as the local privacy setting. The opt-in "send full paths to cloud" toggle only takes effect when local `privacy.filePathMode` is also `full`.

**What is pushed:**
- Event metadata (timestamps, durations, machine/extension IDs)
- File paths (hashed by default)
- Project names
- Session boundaries
- Settings sections (excluding `extension` and `cloudSync`)

**What is never pushed:**
- DSN / credentials
- Bridge tokens (`settings_sections.extension`)
- Local-only ephemeral state
- Analytics rollups
- Runtime-derived settings sections

## Migrations on user infrastructure

Migrations are forward-only SQL files embedded via `//go:embed` from `apps/desktop/internal/cloudsync/migrations/postgres/`. The runner uses a Postgres advisory lock so two clients cannot migrate concurrently.

```
acquire pg_advisory_lock( hash('kairos_migrate') )
remote_v = SELECT COALESCE(MAX(version), 0) FROM kairos_schema_version
for each embedded migration with version > remote_v ordered by version:
  BEGIN
    execute migration SQL
    INSERT INTO kairos_schema_version (version, applied_by_machine)
  COMMIT
release pg_advisory_unlock(...)
```

**Permissions:**
- Migration / init: CREATE TABLE, CREATE INDEX, ALTER TABLE + DML.
- Runtime sync: DML on data tables, SELECT/UPDATE on control tables.

Users who care about least privilege configure two Postgres roles and supply two DSNs. Single-DSN setup is supported for users who don't.

There is no rollback. Document any schema change with a forward path.

## Provisioning flows

### Init (first machine, fresh DB)

1. User enters DSN(s) in Settings → Cloud Sync.
2. Client connects, runs `SELECT 1`.
3. Checks for `kairos_cloud_meta`. None found → init mode.
4. Runs migrations (requires admin DSN).
5. Generates `cloud_id` UUID and `path_hash_salt`. Writes `kairos_cloud_meta`.
6. Writes own `kairos_machines` row.
7. Enables sync; begins backfill push of local data.

### Join (subsequent machine, existing DB)

1. Same connect + check.
2. `kairos_cloud_meta` exists → join mode.
3. Verifies `client_schema_version` compatibility against `kairos_schema_version`.
4. Reads `path_hash_salt` into local `cloud_config`.
5. Writes own `kairos_machines` row.
6. Either:
   - **Full backfill**: chunked pull of all events from remote, then reconcile sessions.
   - **Sync from now**: cursor set to current time. Past data not pulled.

### Unlink

Removes local sync config and outbox. Drops own `kairos_machines.last_seen_at`. Other machines stop seeing this one as active. Local SQLite untouched. User can rejoin later.

### Reset (destructive)

Drops all `kairos_*` and synced data tables on the remote DB. Requires admin DSN. Confirms twice. Local SQLite untouched. Use when starting over or migrating infrastructure.

## UI surface

- **Settings → Cloud Sync** section:
  - DSN inputs (runtime + optional admin), masked display
  - Test connection button
  - Init / join / unlink / reset actions
  - Sync interval (30–300s)
  - Full paths to cloud toggle (gated on `privacy.filePathMode = full`)
  - Per-machine list with `last_seen_at`
- **Status panel:**
  - Last push / last pull timestamps
  - Outbox depth
  - Schema version (local + remote)
  - Recent errors
- **Global sync indicator** integrates with existing `src/lib/sync-status.ts`.
- **Privacy disclosure** modal before first init enumerates exactly what gets pushed.

## Failure modes

| Symptom | Behavior |
|---|---|
| Network unreachable | Outbox grows; app fully functional; status shows "offline" |
| Auth failure | Sync paused; actionable error surfaced in Settings |
| Schema local > remote | Offer "run migration" (needs admin DSN) |
| Schema local < remote | Refuse sync; prompt client upgrade |
| Quota exceeded | Surface provider error; suggest tier upgrade |
| Outbox > 100k rows | Drop oldest with warning; persistent banner |
| Migration lock contention | Wait + retry; one machine wins, others skip |

Logging is structured and excludes DSN and row content. A verbose mode is available for support diagnostics.

## Phased rollout

| Phase | Scope |
|---|---|
| 0 | Spec doc (this file), schema files drafted |
| 1 | Connect + migrate + events push only — single-machine pipeline proof |
| 2 | Events pull + incremental sessionization on union |
| 3 | Settings sync per-section LWW |
| 4 | Tombstones + delete propagation + 30d sweep |
| 5 | UI: setup wizard, status panel, unlink/reset |
| 6 | "Sync from now" toggle + provider setup docs |
| 7 | Beta release behind feature flag in `appBehavior` |

## Testing strategy

- **Unit:** outbox enqueue, cursor advance, mask, conflict logic.
- **Integration:** testcontainers-go with real Postgres. Migrations up; reject "down" with documented error.
- **End-to-end:** two `App` instances against shared Postgres. Push from A, pull on B, verify sessions match. LWW conflict test for settings.
- **Shadow mode:** full + incremental sessionization side by side; divergence triggers warning.
- **Privacy:** file path hashing applied before push; full-path opt-in only when both flags set.
- **CI:** add `make test-cloud` with Postgres service. Independent from `make test-unit` so SQLite-only contributors aren't gated on Postgres.

## Package layout

```
apps/desktop/internal/cloudsync/
├── client.go              # pgx pool, connection lifecycle
├── credentials.go         # OS keychain integration
├── migrate.go             # advisory-locked runner
├── migrations/postgres/   # numbered .sql, //go:embed
│   ├── 0001_init.sql
│   ├── 0002_events.sql
│   ├── 0003_sessions.sql
│   ├── 0004_settings.sql
│   └── 0005_machines.sql
├── outbox.go              # local enqueue hooks
├── push.go                # batched push worker
├── pull.go                # cursor-based pull worker
├── cursor.go              # per-table watermarks
├── mask.go                # path hashing + PII filter
├── reconcile.go           # incremental sessionization trigger
├── status.go              # state for UI
└── wizard.go              # init/join/unlink/reset flows
```

Frontend additions:

```
src/pages/SettingsPage/sections/CloudSync.tsx
src/lib/cloudsync/{client,status,wizard}.ts
```

## Open questions

1. **Path hash salt loss:** if the user destroys the cloud DB and recreates it, salts diverge and hashes change. Document; consider exporting the salt for disaster recovery.
2. **Sessionization shadow-mode lifetime:** how many releases before we trust incremental and drop the shadow check?
3. **Machine identity stability:** `kairos.machineId` is generated locally. If a user restores a backup or migrates devices, the same identity may attach to a different physical machine. v1 does not strengthen this.
4. **Bridge token discoverability:** the `extension` settings section is per-machine. If user re-pairs the VS Code extension on a new machine, they paste the token manually. Sync does not help with first-time pairing.
5. **`cloudSync` per-machine config sync:** intentionally not synced (chicken/egg). Documented in inclusion matrix.

## Future work (out of v1)

- libSQL/Turso target
- Client-side encryption (deterministic on key columns)
- Web dashboard reading the same DB
- Multi-tenant / team sharing with row-level `user_id`
- Cloud-aware analytics rollups

## Related docs

- [architecture.md](./architecture.md)
- [backend-hardening.md](./backend-hardening.md)
- [sessionization.md](./sessionization.md)
- [page-data-assembly.md](./page-data-assembly.md)
- [settings-system.md](./settings-system.md)
