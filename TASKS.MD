# Kairos KPI Tasks

This task list implements `KPI.MD` through the phased plan in `PLAN.MD`.

## Phase 0: Preparation

- [x] Confirm the first product surface for KPI work: overview, analytics, sessions, calendar, or settings.
- [x] Define shared naming conventions for KPI fields and metric groups.
- [x] Add formula notes for derived metrics near backend aggregation code.
- [x] Decide which metrics need raw numeric values, display labels, trend metadata, or all three.
- [x] Confirm empty-state behavior for each KPI group.
- [x] Confirm chart types for heatmaps, trends, and distributions.

## Phase 1: Session-Derived Metrics

- [x] Add shared TypeScript contracts for session KPI summaries.
- [x] Add matching Go contracts for session KPI summaries.
- [x] Implement active-day and coding-streak helpers.
- [x] Implement rolling 7-day and 30-day average helpers.
- [x] Implement current-period vs previous-period delta helpers.
- [x] Implement best day, best week, and best month helpers.
- [x] Implement average, median, p90, and longest session duration helpers.
- [x] Implement deep work minutes and deep work block count.
- [x] Add configurable deep work threshold plumbing.
- [x] Implement fragmentation score from short sessions and total sessions.
- [x] Implement longest and median break gap calculations.
- [x] Implement first activity and last activity summary by range.
- [x] Implement focus window calculation.
- [x] Implement weekday and hourly heatmap aggregation.
- [x] Implement consistency score.
- [x] Add backend tests for zero activity, one session, multiple sessions, and cross-day ranges.
- [x] Add frontend adapter tests for the new payload shape.
- [x] Wire Phase 1 metrics into the selected UI surface.
- [x] Verify UI follows title-only header rules.

## Phase 2: Context And Switching Metrics

- [x] Add shared contracts for context KPI summaries.
- [x] Add matching Go contracts for context KPI summaries.
- [x] Implement project switching rate.
- [x] Implement language switching rate.
- [x] Implement project focus score.
- [x] Implement language focus score.
- [x] Implement project momentum.
- [x] Implement language momentum.
- [x] Implement cross-machine coding time split.
- [x] Implement cross-machine continuity detection.
- [x] Implement workspace continuity metrics from raw events.
- [x] Implement branch time from `gitBranch`.
- [x] Implement branch switching rate.
- [x] Implement project plus branch breakdowns.
- [x] Add tests for missing project, language, workspace, machine, and branch data.
- [x] Wire context metrics into analytics UI.

## Phase 3: Event-Level Activity Metrics

- [x] Add shared contracts for event-level activity KPIs.
- [x] Add matching Go contracts for event-level activity KPIs.
- [x] Implement event density.
- [x] Implement edit event counts by session and day.
- [x] Implement save event counts by session and day.
- [x] Implement edit/save ratio.
- [x] Implement first open to first edit timing.
- [x] Implement edit to save timing.
- [x] Implement active vs passive coding mix.
- [x] Implement session warm-up time.
- [x] Implement return-after-idle time.
- [x] Implement activity burst detection.
- [x] Implement heartbeat-only session share.
- [x] Implement event type mix by project, language, and machine.
- [x] Add tests for disabled event categories.
- [x] Add large-dataset aggregation benchmark coverage.
- [x] Wire event-level metrics into analytics or session details UI.

## Phase 4: Privacy-Optional File Metrics

- [x] Add an explicit setting for file metric opt-in.
- [x] Add shared contracts for file KPI summaries.
- [x] Add matching Go contracts for file KPI summaries.
- [x] Implement privacy gate checks before computing or returning file metrics.
- [x] Implement file and directory hotspots.
- [x] Implement most revisited files.
- [x] Implement source, test, docs, config, build, generated, and infrastructure classifiers.
- [x] Implement test vs source time.
- [x] Implement documentation time.
- [x] Implement configuration and infrastructure time.
- [x] Implement file churn proxy.
- [x] Implement long-running file focus blocks.
- [x] Implement unique files per session.
- [x] Implement project area breakdowns from directory patterns.
- [x] Add tests for redacted, missing, and available `filePath` data.
- [x] Wire file metrics into UI only when opt-in is enabled.

## Phase 5: Reliability And Data Quality Metrics

- [x] Add shared contracts for tracking health KPIs.
- [x] Add matching Go contracts for tracking health KPIs.
- [x] Implement offline buffered event count.
- [x] Implement offline buffered time window.
- [x] Implement oldest pending event age.
- [x] Implement quarantined event count.
- [x] Implement sync latency from event timestamp to `ingested_at`.
- [x] Implement duplicate event rate.
- [x] Implement rejected event rate.
- [x] Implement accepted event count trend.
- [x] Implement tracking coverage gap detection.
- [x] Implement last successful sync and handshake summaries.
- [x] Implement machine last-seen freshness.
- [x] Implement session rebuild freshness.
- [x] Add tests for healthy, stale, degraded, and no-data tracking states.
- [x] Wire reliability metrics into settings or system status UI.

## Phase 6: Insight Scores

- [x] Document formula inputs for each score.
- [x] Add shared contracts for insight scores.
- [x] Add matching Go contracts for insight scores.
- [x] Implement momentum score.
- [x] Implement focus score.
- [x] Implement consistency score.
- [x] Implement fragmentation score.
- [x] Implement recovery score.
- [x] Implement tracking health score.
- [x] Implement project investment score.
- [x] Add sparse-history and zero-activity tests.
- [x] Add UI affordance to inspect score inputs.
- [x] Avoid in-app copy that describes how to use the feature directly under headers.

## Release Readiness

- [ ] Update docs after each shipped KPI phase.
- [ ] Add migration notes if persisted schema changes.
- [ ] Verify analytics performance with representative local data.
- [x] Run desktop backend tests.
- [x] Run frontend checks.
- [ ] Validate UI at desktop and narrow widths.
- [ ] Confirm privacy behavior before enabling file metrics.
