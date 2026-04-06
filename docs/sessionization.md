# Kairos Sessionization

## V1 rules

- Sessions are derived only from persisted raw events in SQLite.
- Events are processed in deterministic order: machine, timestamp, id.
- Sessions never merge across machines.
- Sessions never merge across calendar dates.

## Idle threshold

- A session continues while the gap between consecutive events is at most 5 minutes.
- If the gap exceeds 5 minutes, a new session starts.

## Merge behavior

- After the first split pass, adjacent sessions on the same machine and same date are merged when the gap is at most 10 minutes.
- This keeps the merge rule explicit and deterministic.

## Dominant project and language

- Primary project is the most frequent project in the session’s events.
- Primary language is the most frequent language in the session’s events.
- Ties are broken deterministically by lexical order.

## Duration

- Duration is computed from `endTime - startTime`.
- Duration is rounded up to whole minutes.
- A single-event session is stored as at least 1 minute.

## Rebuild strategy

- Rebuilds are explicit.
- Supported scopes:
  - all sessions
  - one date
  - a date range
- Rebuild deletes sessions only in the target scope, regenerates them from raw events, and writes fresh results.

## Deferred

- automatic post-ingestion session rebuilds
- page-level analytics assembly
- summaries and reporting tables
- richer heuristics beyond deterministic time-gap rules
