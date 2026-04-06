# Page Data Assembly

## Sources

- Overview: persisted sessions for weekly totals, trends, projects, languages, and recent sessions; persisted events for latest activity; settings/runtime data for tracking, privacy, machine, and storage status.
- Calendar month: persisted sessions aggregated into day summaries for the requested month.
- Calendar day: persisted sessions for totals, breakdowns, and session rows; persisted events for first/last activity timestamps.
- Sessions page: persisted sessions in the requested range.
- Analytics page: persisted sessions in the requested range plus an immediately preceding comparison window of the same length.
- Settings: runtime defaults combined with persisted extension status and storage metadata.

## Range Handling

- `GetOverviewData()` currently returns the current-week overview baseline.
- `GetAnalyticsData(rangeLabel)` and `GetSessionsPageData(rangeLabel)` support:
  - `today`
  - `week`
  - `month`
  - `last-7-days`
  - `last-30-days`
  - `all-time`
  - explicit ranges in `YYYY-MM-DD..YYYY-MM-DD`
- `GetCalendarMonthData(month)` accepts `YYYY-MM`.
- `GetCalendarDayData(date)` accepts `YYYY-MM-DD`.

## Frontend State After This Phase

- Overview now uses real backend data with a thin adapter and keeps the existing UI intact.
- Calendar now uses real backend month/day payloads with a thin adapter and keeps the existing UI intact.
- Sessions, Analytics, and Settings backend surfaces now return real assembled data, but their current frontend pages still need a follow-up wiring pass if they still rely on mocks.

## Deferred

- Dedicated query-input contracts in `packages/shared`
- Projects page wiring, since v1 no longer includes a dedicated Projects page
- Incremental caching or materialized summary tables
- More advanced active-hours heuristics
- Full frontend replacement of remaining mock-backed pages
