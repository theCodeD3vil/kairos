# Kairos KPI Implementation Plan

This plan turns the KPI roadmap in `KPI.MD` into an implementation sequence for Kairos. The goal is to add higher-signal coding-time analytics while keeping the product offline-first, deterministic, and privacy-conscious.

## Principles

- Derive from existing `sessions` data before adding deeper event analysis.
- Keep every metric rebuildable from local persisted data.
- Add shared contracts before UI wiring so backend and frontend stay aligned.
- Treat file path analytics as opt-in because `filePath` can reveal sensitive project structure.
- Prefer simple, explainable formulas over opaque scoring until enough history exists.
- Keep app UI headers title-only and avoid descriptive subtitle text directly under headers.
- Use JolyUI as the only UI component source for `apps/desktop/frontend` unless explicitly changed.

## Data Sources

- `sessions`: duration, date, start/end time, project, language, machine, source event count.
- `events`: event type, timestamp, machine, workspace, project, language, file path, git branch.
- `extension_status`: sync and runtime health details.
- `machines`: machine identity, platform, and last-seen metadata.
- settings: tracking thresholds, event toggles, privacy mode, idle detection, and session merge behavior.

## Delivery Layers

1. Shared contracts in `packages/shared`.
2. Desktop contracts in `apps/desktop/internal/contracts`.
3. Backend aggregation/query logic in `apps/desktop/internal/views` and storage repositories where needed.
4. Frontend data adapters in `apps/desktop/frontend/src/lib/backend`.
5. UI surfaces in overview, analytics, sessions, calendar, or settings.
6. Unit tests for contracts, aggregation math, adapters, and UI behavior.

## Chart Strategy

- Use line or area charts for momentum, rolling averages, accepted event trends, and project/language investment over time.
- Use bar charts for ranked breakdowns, duration distributions, event type mixes, branch breakdowns, and file category totals.
- Use pie or donut charts only for compact share-of-total views such as project, language, machine, and file category splits.
- Use heatmaps for weekday, hourly, calendar, activity burst, and tracking coverage gap patterns.
- Keep chart payloads numeric and presentation-agnostic so frontend views can swap chart types without changing backend formulas.

## Phase 1: Session-Derived Metrics

Goal: ship high-value analytics from existing session summaries.

Scope:
- Coding streaks.
- Rolling 7-day and 30-day averages.
- Current vs previous period deltas.
- Best day, week, and month.
- Median, p90, average, and longest session duration.
- Deep work minutes and deep work block count.
- Fragmentation score.
- Break gap metrics.
- Focus window and heatmaps.
- Consistency score.

Implementation notes:
- Extend analytics payloads with session KPI summaries.
- Keep formulas deterministic and documented near the aggregation code.
- Start with backend tests using fixed date ranges.
- Prefer exposing raw component values along with formatted labels so UI remains flexible.

Acceptance:
- Metrics are correct for empty, single-day, multi-day, and all-time ranges.
- Existing overview, analytics, calendar, and session data remains backward compatible.
- Tests cover edge cases for single-event sessions, zero activity, and cross-day ranges.

## Phase 2: Context And Switching Metrics

Goal: explain how coding time moves across projects, languages, branches, workspaces, and machines.

Scope:
- Project and language switching rates.
- Project and language focus scores.
- Project and language momentum.
- Cross-machine time split and continuity.
- Workspace continuity.
- Branch time, branch switching, and project plus branch breakdowns.

Implementation notes:
- Reuse existing project/language/machine summaries where possible.
- Use raw events for branch and workspace calculations because sessions do not currently store branch/workspace.
- Keep branch analytics resilient when `gitBranch` is missing.

Acceptance:
- Metrics degrade cleanly when branch, workspace, or machine metadata is absent.
- Switching formulas are stable and documented.
- Tests cover repeated same-context events, alternating contexts, and missing metadata.

## Phase 3: Event-Level Activity Metrics

Goal: measure work rhythm inside sessions.

Scope:
- Event density.
- Edit and save counts.
- Edit/save ratio.
- First open to first edit.
- Edit to save time.
- Active vs passive coding mix.
- Session warm-up time.
- Return-after-idle time.
- Activity bursts.
- Heartbeat-only session share.
- Event type mix by project, language, and machine.

### Implementation outline (locked 2026-05-23)

Known event types from ingestion: `edit`, `save`, `open`, `heartbeat`, `focus`, `blur`. Settings toggles `extension.trackFileOpenEvents`, `trackSaveEvents`, `trackEditEvents` gate ingestion of those categories.

Buckets used by formulas:
- active = `edit` + `save`
- passive = `heartbeat` + `focus` + `blur`
- neutral = `open`
- heartbeat-only session = a session whose events contain only `heartbeat`/`focus`/`blur` (no `edit`, no `save`, no `open`)

Session attribution: events join to a session when `event.machineId == session.machineId`, `event.timestamp` falls inside `[session.startTime, session.endTime]`, and `event.projectName == session.projectName`. Branch-time logic already does the equivalent inside `buildBranchTimeBreakdowns`; reuse that match pattern.

Formulas:
- Event density: `accepted_event_count / durationMinutes` per session; aggregate density = `sum(events_in_sessions) / sum(durationMinutes)`. Rounded to one decimal.
- Edit/save counts per session and per day: tally `EventType == "edit"` and `EventType == "save"` after session attribution.
- Edit/save ratio: `editCount / max(saveCount, 1)`; expose both counts so the UI can show "no saves tracked" without dividing.
- First open → first edit: per session, `firstEdit.timestamp - firstOpen.timestamp` in seconds (skip if either is missing). Return median seconds across sessions.
- Edit → save: per session, median of `min(save.timestamp - edit.timestamp > 0)` pairs; skip sessions with no save.
- Active vs passive mix: bucket all in-session events into active/passive/neutral, expose counts and percentages.
- Session warm-up: per session, time from `firstEvent.timestamp` to the start of the first 5-minute window containing ≥ 2 edits. Median across qualifying sessions; expose the count of qualifying sessions.
- Return-after-idle: median gap (in minutes) between consecutive sessions on the same machine + same day where the gap exceeds `idleTimeoutMinutes`. Reuses existing break-gap data already computed for `LongestBreakMinutes`.
- Activity bursts: within sessions ≥ `defaultDeepWorkThresholdMinutes`, count windows of 5 minutes that contain ≥ 5 active events. Sum across sessions.
- Heartbeat-only session share: `heartbeatOnlySessionCount / sessionCount`.
- Event type mix by project/language/machine: top-5 buckets, each returning `{name, eventTypeCounts: {edit, save, open, heartbeat, focus, blur}, totalEvents}`.

### Contracts

Shared TS additions (`packages/shared/src/views/types.ts`):

```ts
export type EventTypeMixBucket = {
  name: string;
  totalEvents: number;
  editCount: number;
  saveCount: number;
  openCount: number;
  heartbeatCount: number;
  focusCount: number;
  blurCount: number;
};

export type EventActivityKpiSummary = {
  totalEvents: number;
  eventsInSessions: number;
  editCount: number;
  saveCount: number;
  openCount: number;
  heartbeatCount: number;
  focusCount: number;
  blurCount: number;
  activeEventCount: number;
  passiveEventCount: number;
  neutralEventCount: number;
  activeShare: number;
  passiveShare: number;
  neutralShare: number;
  eventDensityPerMinute: number;
  editSaveRatio: number;
  medianFirstOpenToFirstEditSeconds: number;
  medianEditToSaveSeconds: number;
  medianSessionWarmupSeconds: number;
  warmupQualifyingSessionCount: number;
  medianReturnAfterIdleMinutes: number;
  activityBurstCount: number;
  heartbeatOnlySessionCount: number;
  heartbeatOnlySessionShare: number;
  trackEditEvents: boolean;
  trackSaveEvents: boolean;
  trackFileOpenEvents: boolean;
  eventTypeMixByProject: EventTypeMixBucket[];
  eventTypeMixByLanguage: EventTypeMixBucket[];
  eventTypeMixByMachine: EventTypeMixBucket[];
};
```

Add `eventKpis: EventActivityKpiSummary` to `AnalyticsData`. Mirror in Go contracts with the same field tags so `wailsjs/go/models.ts` regenerates cleanly.

### Backend wiring

- New file `apps/desktop/internal/views/event_kpis.go` containing the aggregation helpers + `buildEventActivityKpis(sessions, events, settings)`.
- Call from `assembleAnalyticsData` alongside the existing `buildSessionKpis` / `buildContextKpis`.
- Read `extension.trackEditEvents`, `trackSaveEvents`, `trackFileOpenEvents` from effective settings to populate the disabled-category flags. Aggregation runs on whatever events exist — flags only inform UI copy.
- Benchmark: extend `service_benchmark_test.go` with a `BenchmarkBuildEventActivityKpis` using ~50k events to confirm the aggregation stays linear.

### Frontend wiring

- Extend `loadAnalyticsSnapshot` adapter in `apps/desktop/frontend/src/lib/backend/page-data.ts` to surface `analyticsData.eventKpis` on the `AnalyticsSnapshot`.
- Add `analyticsSnapshot.eventKpis` to the analytics page UI in a "Activity" section with cards for: density, active/passive share, edit/save counts + ratio, warm-up median, return-after-idle median, burst count, heartbeat-only share. Use bar chart for event-type mix.
- Respect title-only header rule. Empty-state copy: "Enable edit/save tracking in Settings → Tracking to see this section."

### Acceptance reminders

- Heartbeat-only and zero-event ranges return safe zeros without dividing.
- When `trackEditEvents = false`, edit-derived metrics still report 0 honestly with the disabled flag set.
- Benchmark stays under existing thresholds.

## Phase 4: Privacy-Optional File Metrics

Goal: add deeper local-only file insights behind explicit privacy controls.

Scope:
- File and directory hotspots.
- Most revisited files.
- Source, test, docs, config, build, generated, and infrastructure time groups.
- Test vs source time.
- File churn proxy.
- Long-running file focus blocks.
- Unique files per session.
- Project area breakdown from directory patterns.

Implementation notes:
- Require an explicit setting before showing file path based analytics.
- Prefer path-derived categories over exposing full paths by default.
- Keep raw path display out of shared summary cards unless the user enables it.

### Implementation outline (locked 2026-05-23)

Add an explicit opt-in `privacy.fileMetricsEnabled` (defaults false). Even with the opt-in on, file metrics still degrade when `privacy.filePathMode == "hidden"` (paths are stripped before persistence and nothing useful remains). When `filePathMode == "masked"`, only the basename survives, so hotspot/directory analysis is reduced to filename-only — disclose that on the surface but still compute file totals and category counts.

Privacy gate flags surfaced on the summary so the UI can render the right empty state:
- `optInEnabled` — `privacy.fileMetricsEnabled`
- `filePathsAvailable` — `privacy.filePathMode != "hidden"`
- `pathsMasked` — `privacy.filePathMode == "masked"`

When `optInEnabled == false` or `filePathsAvailable == false`, return zeroed metrics with these flags set; never run aggregation.

### Classifier rules

Match in order; first hit wins. Run against the lowercased path.

- **generated** — any segment equals `generated` or `.gen` or filename matches `*.generated.*` or `*.pb.go`/`*.pb.ts`
- **build** — any segment in {`dist`, `build`, `out`, `target`, `node_modules`, `.next`, `.nuxt`, `.svelte-kit`, `bin`, `obj`}
- **infrastructure** — filename starts with `Dockerfile`, any segment in {`.github`, `terraform`, `helm`, `k8s`, `kubernetes`, `ansible`, `pulumi`, `cdk`}; or extension in {`.tf`, `.tfvars`, `.tfstate`} or filename matches `docker-compose*`, `Makefile`, `Procfile`
- **test** — any segment in {`__tests__`, `test`, `tests`, `e2e`, `spec`, `__mocks__`}; or filename matches `*_test.go`, `*.test.{ts,tsx,js,jsx,mts,mjs}`, `*.spec.{ts,tsx,js,jsx,mts,mjs,py,rb}`, `test_*.py`
- **config** — extension in {`.json`, `.yaml`, `.yml`, `.toml`, `.ini`, `.env`, `.cfg`, `.conf`}; or filename starts with a dot (dotfile) without code extension; or filename in {`package.json`, `tsconfig.json`, `pnpm-workspace.yaml`}
- **docs** — extension in {`.md`, `.mdx`, `.rst`, `.adoc`, `.txt`}; or any segment in {`docs`, `documentation`}
- **source** — fallback when none above match and extension is in a curated code-extension allowlist (`.go`, `.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.rb`, `.rs`, `.java`, `.kt`, `.swift`, `.c`, `.cpp`, `.cc`, `.h`, `.hpp`, `.cs`, `.php`, `.lua`, `.vue`, `.svelte`)
- **other** — everything else, used so totals reconcile.

Document the table inline above the classifier helper.

### Minute attribution

File path appears only on events. Re-use the Phase 3 attribution: events join to a session by `(machineID, project, timestamp ∈ [start,end])`. For minutes:

- Per session: filter events with non-empty `filePath`. Let `total = len(filtered)`. For each unique file path within the session, `fileMinutes ≈ session.durationMinutes * (file_event_count / total)` (rounded).
- Aggregate per file across sessions (sum minutes and event counts).
- Aggregate per category by mapping each file path to its classifier bucket.
- Project area = first directory segment beneath the project root or the basename of the parent directory when the path is short; bucket by that segment.

### Contracts (additions to shared TS + Go contracts)

```ts
export type FileHotspot = {
  filePath: string;
  fileName: string;
  category: FileCategory;
  totalMinutes: number;
  eventCount: number;
  editCount: number;
  saveCount: number;
  shareOfTotal: number;
  lastActiveAt?: string;
};

export type FileCategoryBreakdown = {
  category: FileCategory;
  totalMinutes: number;
  eventCount: number;
  fileCount: number;
  shareOfTotal: number;
};

export type ProjectAreaBreakdown = {
  projectName: string;
  area: string;
  totalMinutes: number;
  eventCount: number;
  shareOfTotal: number;
};

export type FileFocusBlock = {
  filePath: string;
  fileName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  eventCount: number;
};

export type FileKpiSummary = {
  optInEnabled: boolean;
  filePathsAvailable: boolean;
  pathsMasked: boolean;
  uniqueFileCount: number;
  averageUniqueFilesPerSession: number;
  totalAttributedMinutes: number;
  topFiles: FileHotspot[];
  mostRevisitedFiles: FileHotspot[];
  categoryBreakdown: FileCategoryBreakdown[];
  testVsSource: { testMinutes: number; sourceMinutes: number; testShareOfCode: number };
  documentationMinutes: number;
  configMinutes: number;
  infrastructureMinutes: number;
  fileChurnLeaders: FileHotspot[];
  longRunningFocusBlocks: FileFocusBlock[];
  projectAreaBreakdown: ProjectAreaBreakdown[];
};

export type FileCategory =
  | 'source'
  | 'test'
  | 'docs'
  | 'config'
  | 'build'
  | 'generated'
  | 'infrastructure'
  | 'other';
```

`AnalyticsData.fileKpis: FileKpiSummary` added; mirrored on Go contracts.

### Backend wiring

- New file `apps/desktop/internal/views/file_kpis.go`:
  - `buildFileActivityKpis(sessions, events, privacy)` is the entry point.
  - First step: short-circuit + return zero summary with the gate flags when opt-in off or paths hidden.
  - Re-use the Phase 3 indexed attribution to walk session→events, but additionally normalise the path with `cleanFilePath` (lowercase, replace backslashes), bucket per file, and accumulate per-category aggregates.
  - Long-running focus blocks: per file, walk attributed events in chronological order. Open a block on the first edit/save; extend while consecutive edit/save gaps stay within `idleTimeoutMinutes`. Close + record when the gap exceeds the threshold or the iteration ends. Surface blocks where the resulting duration ≥ 15 minutes.
  - File churn leaders: sort files by `editCount + saveCount` desc, keep top 5.
  - Project area: take session.ProjectName as scope. Strip the project name from the path if it appears as a leading segment, then take the first remaining segment as the area; fallback `(root)`.

- Settings exposure: add `FileMetricsEnabled` to `PrivacySettings`, default false. Add to validation + extension-effective settings if the extension transport needs to honour it later (it does not gate ingestion — paths still get persisted per `filePathMode` rules — so the change here is read-only on the desktop side).

- Tests:
  - Classifier table tests for every category.
  - Gate test: opt-in off → empty summary + flags.
  - Gate test: paths hidden → empty summary + flags, even when opt-in on.
  - Aggregation test: small fixture covering all categories.
  - Long focus block test ≥ 15min spans single file.

### Frontend wiring

- Extend [page-data.ts](apps/desktop/frontend/src/lib/backend/page-data.ts) adapter: pull `fileKpis` from `GetAnalyticsData` response (same call already used for event KPIs) with a graceful empty fallback.
- Add `FileKpiSummary` types to [mockAnalytics.ts](apps/desktop/frontend/src/data/mockAnalytics.ts) with the matching empty helper.
- Analytics page section "Files" — only shown when `optInEnabled && filePathsAvailable`. Card grid + top-files table + category bar. Empty states:
  - opt-in off → CTA pointing to Settings → Privacy.
  - opt-in on but paths hidden → "File metrics need file path mode set to Masked or Full."
  - opt-in on, masked → caption "Showing filenames only — full paths are masked."
- Settings → Privacy → toggle for "Enable file metrics" backed by the new setting.

Title-only header rule applies. Headings stay short ("Files", "By category", "Focus blocks").

Acceptance:
- File metrics are hidden when privacy mode disables file paths or the user has not opted in.
- Category rules are documented and testable.
- UI clearly handles redacted or unavailable path data.

## Phase 5: Reliability And Data Quality Metrics

Goal: make tracking trust visible and debuggable.

Scope:
- Offline buffered event count and buffered time window.
- Oldest pending event age.
- Quarantined event count.
- Sync latency.
- Duplicate and rejected event rates.
- Accepted event trend.
- Tracking coverage gaps.
- Last successful sync and handshake time.
- Machine freshness and session rebuild freshness.

Implementation notes:
- This phase can run in parallel with Phase 2 or Phase 3 when diagnostics are a priority.
- Prefer settings/system surfaces for health metrics, with a compact overview indicator only if useful.
- Use `ingested_at` for latency where available.

### Implementation outline (locked 2026-05-23)

Surface reliability KPIs on `SettingsData.reliability` so the existing `GetSettingsData` call carries them — no new Wails binding to keep this phase fast.

Sources:
- `extension_status` row (per editor) → pendingEventCount, oldestPendingEventAt, quarantinedEventCount, lastSuccessfulSyncAt, lastHandshakeAt, lastEventAt.
- `events` table → `ingested_at` vs `timestamp` for sync latency, GROUP BY ingested date for accepted trend.
- `sessions` table → `MAX(updated_at)` for session rebuild freshness.
- `machines` table → per-machine `last_seen_at` for freshness staleness count.
- Settings service runtime rejected counter → rejected events when wired from ingestion; duplicate-event totals are not persisted, surface as zero with a flag.

Status thresholds:
- `healthy` — `lastIngestedAt` within 5 minutes, pending=0, quarantined=0.
- `buffered` — pending>0 with `oldestPendingEventAt` within the last hour.
- `degraded` — pending>0 and oldest pending older than one hour, or quarantined>0, or sync latency p90 > 60s.
- `stale` — no events ingested in the last 24h while tracking is enabled.
- `no-data` — `lastIngestedAt` empty.

Formulas:
- Sync latency: per recent event, `ingested_at - timestamp` in seconds. Compute over the most recent 500 events to bound cost. Return median + p90 + sample size.
- Accepted event trend: GROUP BY `substr(ingested_at, 1, 10)` over the last 14 days. Fill missing days with zero.
- Coverage gaps: walk existing recent sessions chronologically; flag calendar gaps ≥ 2 days when the surrounding range has any activity. Return up to 5 longest.
- Machine freshness: surface staleness buckets {fresh: ≤24h, stale: 24h–7d, dormant: >7d, no-activity: never seen} based on `machines.last_seen_at`.
- Rebuild freshness: MAX of `sessions.updated_at`. Compute age vs now.
- Rejected event rate: `runtimeRejectedEventCount / (totalAcceptedEvents + runtimeRejectedEventCount)`.
- Duplicate event rate: computed only when duplicate totals become persisted; until then expose zero with `duplicateCountAvailable=false`.

### Contracts

Add to Go contracts and shared TS:

```ts
export type ReliabilityStatus =
  | 'no-data'
  | 'healthy'
  | 'buffered'
  | 'degraded'
  | 'stale';

export type SyncLatencyStats = {
  sampleSize: number;
  medianSeconds: number;
  p90Seconds: number;
};

export type AcceptedEventTrendPoint = {
  date: string;
  acceptedCount: number;
};

export type MachineFreshnessBucket = {
  bucket: 'fresh' | 'stale' | 'dormant' | 'no-activity';
  machineCount: number;
};

export type TrackingCoverageGap = {
  startDate: string;
  endDate: string;
  durationDays: number;
};

export type ReliabilityKpiSummary = {
  status: ReliabilityStatus;
  pendingEventCount: number;
  bufferedTimeWindowMinutes: number;
  oldestPendingEventAt?: string;
  quarantinedEventCount: number;
  runtimeRejectedEventCount: number;
  duplicateEventCount: number;
  duplicateCountAvailable: boolean;
  duplicateEventRate: number;
  rejectedEventRate: number;
  totalAcceptedEvents: number;
  syncLatency: SyncLatencyStats;
  acceptedEventTrend: AcceptedEventTrendPoint[];
  trackingCoverageGaps: TrackingCoverageGap[];
  lastIngestedAt?: string;
  lastSuccessfulSyncAt?: string;
  lastHandshakeAt?: string;
  lastEventAt?: string;
  lastSessionRebuildAt?: string;
  machineFreshness: MachineFreshnessBucket[];
};
```

`SettingsData.reliability` added; shared TS settings type mirrors it and exports the reliability types from `@kairos/shared/settings`.

### Backend wiring

- New file `apps/desktop/internal/settings/reliability_kpis.go` with the assembler. The settings service already has store access plus the resolved `ExtensionStatus`, so the helper reads from there and adds new storage queries:
  - `Store.GetLastSessionUpdate` → `SELECT MAX(updated_at) FROM sessions`.
  - `Store.GetRecentSyncLatencySamples` → pulls the 500 most recent events with both `timestamp` and `ingested_at` populated, returns latency samples for median + p90.
  - `Store.GetAcceptedEventDailyTrend` → groups recent events by ingested date.
  - `Store.ListMachineLastSeen` → returns machine last-seen timestamps for 4 frontend-facing bucket counts.
- Wire into `GetSettingsData` after `dataStorage` is built.

Status resolution uses `time.Now().UTC()` from the service's `now()` hook so tests can pin the clock.

### Frontend wiring

- Shared types in `packages/shared/src/settings/types.ts` extended with `reliability`.
- `apps/desktop/frontend/src/lib/backend/settings.ts` adapter copies the `reliability` block onto `SettingsScreenData` and provides an empty helper.
- Settings page gains a "Tracking Health" section showing status pill, pending count, sync latency, last sync/handshake, machine freshness bar chart, accepted-event trend area chart, and coverage gap list.
- Empty/loading states use the existing settings-section pattern. No new pages.
- `wailsjs/go/models.ts` is hand-edited to include the new types and `SettingsData.reliability` since the next `wails build` will regenerate identically.

### Tests

- `apps/desktop/internal/settings/reliability_kpis_test.go` covers: no-data → `no-data` status, healthy when pending=0 + recent ingest, buffered when pending>0 + oldest recent, degraded when pending>0 + oldest >1h, stale when last ingest >24h ago, sync latency aggregation on a fixed event fixture, machine freshness bucket math.
- Storage tests for the three new queries (use the in-memory store fixture).
- Frontend typecheck verifies the adapter and settings UI contract wiring.

Acceptance:
- Health metrics distinguish no data, healthy state, degraded state, and stale state.
- Runtime status remains accurate when the desktop app is offline or buffering.
- Tests cover stale status, missing extension status, and delayed ingestion.

## Phase 6: Insight Scores

Goal: combine stable low-level metrics into concise scores.

Scope:
- Momentum score.
- Focus score.
- Consistency score.
- Fragmentation score.
- Recovery score.
- Tracking health score.
- Project investment score.

Implementation notes:
- Ship scores only after lower-level metrics are visible and trusted.
- Keep every score decomposable into its inputs.
- Avoid punitive copy; scores should guide review, not judge the developer.

### Implementation outline (locked 2026-05-23)

Surface insight scores on `AnalyticsData.insightScores` because the formulas compose analytics and tracking-health inputs already loaded for the Analytics page.

Contracts:
- `InsightScoreInput` contains `label`, raw `value`, normalized `score`, and `weight`.
- `InsightScore` contains the final 0-100 `score`, a `direction` (`higher-is-better` or `lower-is-better`), and the input list.
- `InsightScoreSummary` contains momentum, focus, consistency, fragmentation, recovery, tracking health, project investment, and a top-5 project investment breakdown.

Formulas:
- Momentum score: weighted 7d-vs-30d rolling-average direction and current-period-vs-previous-period delta.
- Focus score: weighted deep-work share, top-project concentration, and low project/language switching pressure.
- Consistency score: weighted active-day coverage, current streak against a 7-day target, and longest streak against the visible period.
- Fragmentation score: lower-is-better weighted risk from short-session share, project/language switching pressure, and median break-gap pressure.
- Recovery score: weighted return-after-idle interval, median break interval, and session continuity.
- Tracking health score: weighted reliability status, sync latency p90, pending event count, and rejected event rate.
- Project investment score: top-project weighted time share, active-day coverage, and project momentum. Breakdown ranks the top 5 projects with the same formula.

Frontend wiring:
- Analytics gets an `Insight scores` section with cards for each score.
- Each score card uses a native details affordance to inspect inputs.
- Score mix and project investment use bar charts.

Acceptance:
- Score formulas are documented.
- Each score can show its contributing inputs.
- Scores behave sensibly with sparse history and zero-activity ranges.

## Suggested Order

1. Phase 1 for immediate user-facing value.
2. Phase 2 for richer analytics context.
3. Phase 3 once raw event aggregations are tested.
4. Phase 4 after explicit privacy controls are designed.
5. Phase 5 in parallel if tracking trust and diagnostics are priorities.
6. Phase 6 after enough historical data makes scores meaningful.
