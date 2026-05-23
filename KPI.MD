# Kairos KPI Roadmap

This document groups potential Kairos coding-time metrics into phased implementation buckets. The phases favor metrics that can be derived from the current sessions/events model before introducing new ingestion scope or privacy-sensitive analysis.

## Phase 1: Session-Derived Metrics

These metrics can be built mostly from persisted sessions and current analytics data.

- Total coding time by day, week, month, and custom range.
- Active days in range.
- Coding streaks, including current streak and longest streak.
- Rolling 7-day and 30-day coding-time averages.
- Current period vs previous period delta.
- Best day, week, and month by total coding time.
- Average, median, p90, and longest session duration.
- Deep work minutes from sessions above a configurable threshold.
- Deep work block count.
- Fragmentation score from short-session count vs total session count.
- Longest break between sessions.
- Median break between sessions.
- First activity and last activity per day.
- Focus window from most active hours.
- Weekday heatmap and hourly heatmap.
- Consistency score from active days divided by available days.

## Phase 2: Context And Switching Metrics

These metrics use existing project, language, machine, workspace, and branch context.

- Project switching rate per day.
- Language switching rate per day.
- Project focus score from share of time in the top project.
- Language focus score from share of time in the top language.
- Top project by time, sessions, and active days.
- Top language by time, sessions, and active days.
- Project momentum from rolling time by project.
- Language momentum from rolling time by language.
- Cross-machine coding time split.
- Cross-machine continuity when work resumes on another machine.
- Workspace continuity across projects and machines.
- Branch time from existing `gitBranch` event data.
- Branch switching rate.
- Project plus branch breakdowns for feature-level time analysis.

## Phase 3: Event-Level Activity Metrics

These metrics require analyzing raw events more deeply than the current session summaries.

- Event density from `sourceEventCount / durationMinutes`.
- Edit event count by session and day.
- Save event count by session and day.
- Edit/save ratio where save tracking is enabled.
- Time from first open event to first edit event.
- Time from edit event to save event.
- Active vs passive coding mix using edit, save, and heartbeat events.
- Session warm-up time from first activity to sustained edit activity.
- Return-after-idle time from session gaps.
- Activity burst count within long sessions.
- Heartbeat-only session share.
- Event type mix by project, language, and machine.

## Phase 4: Privacy-Optional File Metrics

These metrics should stay opt-in because they rely on file paths or path-derived classification.

- File or directory hotspots from `filePath`.
- Most revisited files.
- Time by source, test, docs, config, build, and generated file groups.
- Test vs source time.
- Documentation time.
- Configuration and infrastructure time.
- File churn proxy from repeated edit/save activity on the same file.
- Long-running file focus blocks.
- Context spread from unique files touched per session.
- Project area breakdown from directory patterns.

## Phase 5: Reliability And Data Quality Metrics

These metrics explain whether Kairos tracking itself is healthy and trustworthy.

- Offline buffered event count.
- Offline buffered time window.
- Oldest pending event age.
- Quarantined event count.
- Sync latency from event timestamp to `ingested_at`.
- Duplicate event rate.
- Rejected event rate.
- Accepted event count trend.
- Tracking coverage gaps by detecting long calendar gaps after recent activity.
- Last successful sync time.
- Last desktop handshake time.
- Machine last-seen freshness.
- Session rebuild freshness.

## Phase 6: Insight Scores

These are composite KPIs built from lower-level metrics after the underlying data is stable.

- Momentum score from rolling average direction and current-period delta.
- Focus score from deep work minutes, low switching, and top-project concentration.
- Consistency score from streaks and active-day coverage.
- Fragmentation score from short sessions, gaps, and switching rate.
- Recovery score from return-after-break patterns.
- Tracking health score from sync latency, pending events, and rejection rates.
- Project investment score combining time, active days, and recent momentum.

## Suggested Build Order

1. Ship Phase 1 because it uses existing session summaries and gives immediate dashboard value.
2. Add Phase 2 to make analytics more useful for project and language review.
3. Add Phase 5 in parallel with Phase 2 if trust and debugging are product priorities.
4. Add Phase 3 once event-level queries and tests are stable.
5. Add Phase 4 only behind explicit privacy controls.
6. Add Phase 6 after enough historical data exists to make composite scores meaningful.
