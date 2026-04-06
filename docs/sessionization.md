# Kairos Sessionization

## V1 rules

- Sessions are derived only from persisted raw events in SQLite.
- Events are processed in deterministic order: machine, timestamp, id.
- Sessions never merge across machines.
- Sessions never merge across calendar dates.
- Sessionization runs in two explicit phases:
  - initial session creation from raw-event idle gaps
  - post-build merge pass across adjacent compatible sessions

## Idle threshold

- A session continues while the gap between consecutive events is at most 5 minutes.
- If the gap exceeds 5 minutes, a new session starts.

## Merge behavior

- After the initial split pass, Kairos sorts sessions by date, machine, and start time.
- Only chronologically adjacent sessions in the same machine/day stream are considered for merging.
- Two adjacent sessions merge only when all of the following are true:
  - same date
  - same machine
  - same dominant project
  - gap between `previous.endTime` and `current.startTime` is less than or equal to `sessionMergeThresholdMinutes`
- Sessions are never merged purely because they happened on the same day.
- This keeps the merge rule explicit, deterministic, and debuggable.

## Dominant project and language

- Primary project is the most frequent project in the session’s events.
- Primary language is the most frequent language in the session’s events.
- Ties are broken deterministically by lexical order.
- During a merge, language is recomputed from the merged session’s full event set using that same rule.
- That means same-project sessions can still merge even if their dominant languages differ.

## Duration

- Duration is computed from `endTime - startTime`.
- Duration is rounded up to whole minutes.
- A single-event session is stored as at least 1 minute.
- Merged sessions recompute duration from the merged start and end times.
- `sourceEventCount` is combined from all merged source events.

## Rebuild strategy

- Rebuilds are explicit.
- Supported scopes:
  - all sessions
  - one date
  - a date range
- Rebuild deletes sessions only in the target scope, regenerates them from raw events, and writes fresh results.
- Rebuild persists only the final merged sessions. Raw intermediate fragments are not stored in SQLite.

## Settings

- `idleTimeoutMinutes` controls the initial split pass.
- `sessionMergeThresholdMinutes` controls the merge pass.
- Both values come from the desktop tracking settings when available.

## Deferred

- page-level analytics assembly
- summaries and reporting tables
- richer heuristics beyond deterministic time-gap rules
