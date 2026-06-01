# Kairos Cloud Sync Implementation Plan

This plan turns the cloud-sync design in [docs/cloud-sync.md](./docs/cloud-sync.md) into an implementation sequence. The goal is multi-machine consistency via user-owned Postgres infrastructure while keeping Kairos offline-first, deterministic, and privacy-conscious.

## Principles

- Local SQLite remains the source of truth for the UI.
- Users own their data; we never host it.
- Postgres-only v1, TLS required, BYO infrastructure (Supabase, Neon, RDS, Railway, self-hosted).
- Offline-first is preserved: a local outbox plus per-table cursors mean the app works when the cloud DB is unreachable.
- Events are partitioned by `machine_id`, so cross-machine write conflicts are impossible by construction.
- Privacy is default-strict: file paths are hashed before they leave the machine unless the user opts in.
- Forward-only schema migrations against the user's Postgres, run under an advisory lock.
- Keep app UI headers title-only and avoid descriptive subtitle text directly under headers.
- Use JolyUI as the only UI component source for `apps/desktop/frontend` unless explicitly changed.

## Locked Decisions

| Concern | Choice |
|---|---|
| DB engine v1 | Postgres 14+, TLS required |
| Credential model | One DSN required + optional admin DSN for init/migrate |
| Sessionization | Re-derive locally on union, incremental by `(machine_id, date)`; remote `sessions` is a cache |
| Settings conflict | Per-section LWW on `updated_at` |
| Sync trigger | 60s timer + on-focus + on-settings-change, debounced 15s. Interval configurable 30–300s |
| Tombstone retention | 30 days default, configurable; daily hard-delete sweep |
| Join backfill | Full backfill by default; opt-in "sync from now" toggle |
| PII default | Hashed file paths to cloud; opt-in full-path-to-cloud toggle (only honored when local `filePathMode=full`) |

## Data Sources And Targets

- Local SQLite tables (existing): `events`, `sessions`, `settings_sections`, `machines`, `extension_status`.
- Remote Postgres tables (new): `events`, `sessions`, `settings_sections`, `kairos_machines`, plus control tables `kairos_cloud_meta` and `kairos_schema_version`.
- Local SQLite additions (new): `cloud_outbox`, `cloud_cursor`, `cloud_config`.
- Settings inputs read by cloud sync: `privacy.filePathMode`, new `privacy.fileMetricsEnabled` (if Phase 4 of KPI work also lands), and a new `cloudSync` section storing per-machine sync config (not itself synced).

## Delivery Layers

1. New package `apps/desktop/internal/cloudsync/` for connection, migration, push, pull, reconcile, and mask logic.
2. Postgres migrations embedded under `apps/desktop/internal/cloudsync/migrations/postgres/`.
3. Local SQLite additions next to existing storage migrations.
4. Wails bindings: `TestCloudConnection`, `InitCloudSync`, `JoinCloudSync`, `UnlinkCloudSync`, `ResetCloudSync`, `GetCloudSyncStatus`.
5. Frontend additions: `src/pages/SettingsPage/sections/CloudSync.tsx` and `src/lib/cloudsync/{client,status,wizard}.ts`.
6. Tests at every layer: outbox unit, migration integration, two-instance e2e, shadow-mode parity, privacy mask.

## Phase 1: Schema Bootstrap And Connection

Goal: prove the desktop ↔ user-Postgres pipe with no data sync yet.

Scope:
- pgx client and connection pool.
- Credential storage via OS keychain (macOS Keychain, Windows Credential Manager, libsecret).
- Settings UI for DSN entry (runtime + optional admin) and "Test connection".
- Migration runner using `pg_advisory_lock` so concurrent clients serialize.
- Initial migration creating `kairos_cloud_meta`, `kairos_schema_version`, `kairos_machines`.
- Local SQLite tables: `cloud_outbox`, `cloud_cursor`, `cloud_config`.

Implementation notes:
- Reject `sslmode=disable`. Require TLS for any non-loopback host.
- One DSN supported; if a separate admin DSN is provided, use it only for init and migration.
- Path hash salt is generated on first init and stored in `kairos_cloud_meta.path_hash_salt`; subsequent machines read it during join.
- Mask DSNs in all UI and log output as `postgres://****@host/db`.
- Document required Postgres permissions: CREATE TABLE, CREATE INDEX, ALTER TABLE plus DML for migrations; DML on data tables plus SELECT/UPDATE on control tables for runtime.

Acceptance:
- Test connection succeeds against Supabase, Neon, RDS, and a self-hosted Postgres in CI.
- Re-running init on an initialized DB transparently enters join mode.
- Two clients racing initial migration both succeed; advisory lock serializes, one applies migrations, the other observes them.

## Phase 2: Events Push

Goal: outbound replication of locally produced events.

Scope:
- Storage hook that enqueues a masked payload to `cloud_outbox` after every successful event write.
- Push worker on a 60s timer plus on-window-focus and on-settings-change triggers, debounced 15s.
- Batched upsert (500 rows per push) with exponential backoff (30s, 60s, 2m, 5m, 15m) on failure.
- Privacy mask (HMAC-SHA256 of file path using the shared salt) applied at push time.
- Remote `events` table migration with `updated_at`, `deleted_at`, `origin_machine_id`, `row_version`.

Implementation notes:
- Mask is applied at push time, not at write time, so the local DB still holds full data per its own `filePathMode`.
- Idempotent UPSERT on event `id`. Same event pushed twice is a no-op.
- After 5 consecutive failures, surface the error in Settings → Cloud Sync with actionable copy.
- Outbox cap at 100k rows; beyond that, drop oldest with a persistent warning banner.
- Update `kairos_machines.last_seen_at` within the same remote transaction as the batch.

Acceptance:
- Single-machine round trip: write event locally, observe it on the remote DB within one push cycle.
- Backfilling 100k events shows resumable progress and completes without exceeding the outbox cap.
- Full paths reach the cloud only when both `privacy.filePathMode == "full"` and `cloud_config.full_paths_to_cloud == true`.

## Phase 3: Events Pull And Incremental Sessionization

Goal: inbound replication plus per-`(machine_id, date)` session recompute.

Scope:
- Pull worker driven by per-table watermark in `cloud_cursor`.
- Reconciliation worker that recomputes sessionization for only the date ranges touched by pulled events.
- Shadow mode: run full + incremental sessionization side by side and warn on divergence for the first releases.
- Remote `sessions` table migration; treat it as a cache populated after local recompute.

Implementation notes:
- Skip own rows on pull (`origin_machine_id != self`).
- Advance the cursor atomically with each batch's local UPSERT.
- Reuse the existing `buildBranchTimeBreakdowns` attribution pattern when joining events to sessions.
- Reconcile jobs are idempotent and safe to re-run.
- After local recompute, enqueue resulting session rows back into `cloud_outbox` so the remote cache stays warm.

Acceptance:
- Two-desktop end-to-end test: A pushes events, B pulls, B's local sessions match A's after reconcile.
- Shadow-mode divergence is zero across a fixed fixture covering multi-day and cross-machine ranges.
- Pulling another machine's events does not modify self-machine sessions.

## Phase 4: Settings Sync

Goal: per-section last-write-wins propagation of effective settings.

Scope:
- `settings_sections` remote table migration.
- Push triggered immediately on settings change (bypasses debounce; settings are small and rare).
- Whole-section JSON treated as the unit of conflict.
- Inclusion matrix: sync `general`, `privacy`, `tracking`, `exclusions`, `appBehavior`. Exclude `extension` (per-machine bridge token) and the new `cloudSync` section.

Implementation notes:
- `updated_at` always comes from the local clock at write time.
- Section payloads are compared as opaque JSON; no per-field merge.
- Document the offline-conflict edge case in the UI (later write wins).

Acceptance:
- Both machines online: change on A appears on B within one pull cycle.
- Offline conflict: both edit `general` while disconnected; on reconnect, later `updated_at` wins.
- Excluded sections never appear in `cloud_outbox`.

## Phase 5: Tombstones And Delete Sweep

Goal: soft-delete propagation and retention hygiene.

Scope:
- `deleted_at` column read and written on all synced tables.
- Daily hard-delete sweep removing rows with `deleted_at` older than the retention threshold (30 days default).
- "Delete my data" action that drops `kairos_*` and synced data tables on the remote DB (requires admin DSN, confirms twice).
- Per-machine unlink that removes the machine's own `kairos_machines` row and clears local cursors without touching local SQLite.

Implementation notes:
- Retention sweep runs once per day on app idle; gated by a lock so multiple machines do not sweep at once.
- Document deletion semantics explicitly in Settings UI: "sync, not backup".
- Retention threshold lives in `cloud_config`.

Acceptance:
- Soft delete on A propagates as a tombstone, then disappears locally on B after pull.
- After 30 days, sweep removes tombstoned rows physically.
- Unlink leaves local SQLite untouched; user can rejoin later without data loss.

## Phase 6: UI — Setup Wizard And Status Panel

Goal: production-grade UX for connect, observe, and manage.

Scope:
- New Settings → Cloud Sync section.
- Setup wizard handling both init (fresh DB) and join (existing DB) flows.
- Status panel showing last push, last pull, outbox depth, schema version (local + remote), and recent errors.
- Per-machine list with `last_seen_at` and client schema version.
- Privacy disclosure modal before first init listing exactly what gets pushed.

Implementation notes:
- Reuse existing JolyUI components per project conventions.
- Integrate with `src/lib/sync-status.ts` for the global sync indicator.
- Title-only headers per project rule.
- DSN always masked in any rendered output.

Acceptance:
- A new user can connect to a fresh Supabase project end-to-end without external docs.
- The status panel surfaces every error class (auth, schema skew, quota, network) with actionable copy.

## Phase 7: Join Wizard And "Sync From Now"

Goal: smooth onboarding for the second machine onward.

Scope:
- Join flow detects existing `kairos_cloud_meta` and branches from init.
- Schema version compatibility check with clear "upgrade required" messaging.
- Backfill mode toggle: full historical pull (default) vs cursor set to now.
- Resumable chunked pull with progress UI.

Implementation notes:
- Refuse join when local `client_schema_version` is older than remote `kairos_schema_version`.
- Show a "~X events to pull" estimate before starting full backfill.
- Persist the resumable cursor in `cloud_config` so a crash mid-backfill picks up cleanly.

Acceptance:
- Joining a populated DB with 100k+ events completes with progress reporting and survives a mid-backfill restart.
- "Sync from now" returns to steady-state sync within seconds and clearly labels the local history gap.

## Phase 8: Beta Release Behind Feature Flag

Goal: ship to an opt-in cohort, observe, harden.

Scope:
- New `appBehavior.cloudSyncBetaEnabled` flag gating all Cloud Sync UI.
- Provider setup docs for Supabase, Neon, RDS, Railway, and self-hosted Postgres.
- Anonymized sync error telemetry — no DSN, no row content, no file paths.
- Release checklist updates in `docs/desktop-release-checklist.md`.

Implementation notes:
- Settings → Cloud Sync surface shows a clear "Beta" badge while the flag is on.
- All surfaced errors must contain enough operator-visible context for support without leaking secrets.

Acceptance:
- A 20+ user beta cohort runs for two weeks without data loss reports.
- Top reported issues are triaged before the GA toggle.

## Testing Strategy

- Unit tests for outbox enqueue, cursor advance, mask, and conflict resolution.
- Integration tests using `testcontainers-go` with a real Postgres, including migration up paths and advisory-lock contention.
- End-to-end tests running two `App` instances against a shared Postgres to verify push → pull → reconcile.
- Shadow-mode parity tests for incremental sessionization.
- Privacy mask tests verifying that file path hashing is applied before push and that full paths only reach the cloud under both gates.
- New `make test-cloud` target with a Postgres service in CI, separate from `make test-unit` so SQLite-only contributors are not blocked.

## Suggested Order

1. Phase 1 first — prove the pipe end-to-end.
2. Phase 2 for backup-like single-direction value.
3. Phase 3 to unlock true multi-machine consistency.
4. Phase 4 once event sync is stable.
5. Phase 5 in parallel with Phase 6 — both depend on stable pull.
6. Phases 6 and 7 together for production-grade UX.
7. Phase 8 to beta the whole package behind a flag before GA.
