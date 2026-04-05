# Kairos Backend Hardening

## Migration philosophy

- Migrations are forward-only and ordered by filename.
- Applied migrations are recorded in `schema_migrations`.
- Startup stops immediately if any migration fails.
- Existing migration files are treated as immutable once applied.

## Local-only backend posture

- The desktop backend is local-only.
- Future HTTP ingestion must bind to `127.0.0.1` only.
- Only `POST` and JSON payloads are considered valid for ingestion handlers.
- Request bodies should be capped with the backend request-size limit before decoding.

## Ingestion validation rules

- Requests must include `machine`, `extension`, and a non-empty `events` array.
- Batches larger than the configured max are rejected at the request boundary.
- Required event fields are rejected when empty, invalid, or oversized.
- Optional metadata fields are trimmed and truncated to bounded lengths.
- `event.machineId` must match `request.machine.machineId`.
- Partially valid batches still partially succeed.

## Defensive limits

- Max request body size: `1 MiB`
- Max events per batch: `500`
- Default recent-events limit: `20`
- Max recent-events limit: `200`
- String-length caps are centralized in `apps/desktop/internal/config/limits.go`

## Current persistence safety

- SQLite is the durable source of truth for raw events, machines, and extension status.
- SQLite is opened with WAL mode, foreign keys enabled, busy timeout, and a single open connection.
- Related ingestion writes now run in a single transaction.
- Duplicate event IDs are ignored safely and surfaced as warnings.

## Intentionally deferred

- Sessionization
- Analytics derivation
- Cloud/network authentication
- Persisted rejected-event counters
- Remote deployment concerns
