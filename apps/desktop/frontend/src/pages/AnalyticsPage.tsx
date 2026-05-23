import { useEffect, useRef, useState } from 'react';
import { ActivityGraph } from '@/components/activity-graph';
import { KairosBarChart } from '@/components/charts/kairos-charts';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import {
  AnalyticsBreakdownList,
  AnalyticsDonut,
  AnalyticsKpiCard,
  AnalyticsMachineList,
  AnalyticsTimeBreakdown,
  formatMinutes,
} from '@/components/analytics/AnalyticsCards';
import { AnalyticsComparison } from '@/components/analytics/AnalyticsComparison';
import { AnalyticsSessionsTable } from '@/components/analytics/AnalyticsSessions';
import { overviewChartPalette } from '@/components/overview/chart-colors';
import {
  SessionDetailsDialog,
  type SessionDetailRecord,
} from '@/components/sessions/SessionDetailsDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { desktopResourceKeys, getCachedDesktopResource } from '@/app/DesktopDataContext';
import type { AnalyticsFilters as Filters, InsightScore, RecentSessionRow } from '@/data/mockAnalytics';
import { emptyAnalyticsSnapshot, loadAnalyticsSnapshot } from '@/lib/backend/page-data';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';
import { useDesktopResource } from '@/lib/hooks/useDesktopResource';
import {
  emptySettingsScreenData,
  loadSettingsScreenData,
  type SettingsScreenData,
} from '@/lib/backend/settings';
import { normalizeOverviewRange } from '@/components/overview/types';
import {
  getRangeStorageKey,
  readAnalyticsContextPreference,
  readRangePreference,
  resolveInitialRangePreference,
  saveAnalyticsContextPreference,
  saveRangePreference,
} from '@/lib/settings/preferences';
import { formatDurationMinutes } from '@/lib/time-format';

function resolveInitialAnalyticsFilters(): Filters {
  const settings = getCachedDesktopResource<SettingsScreenData>(desktopResourceKeys.settings());
  const initialRange = resolveInitialRangePreference(
    getRangeStorageKey('analytics'),
    settings?.viewModel.appBehavior.restoreLastSelectedDateRange ?? false,
    settings?.viewModel.general.defaultDateRange,
  );
  const context = settings?.viewModel.appBehavior.reopenLastViewedContext
    ? readAnalyticsContextPreference()
    : null;

  return {
    range: initialRange.range,
    customRange: initialRange.customRange,
    project: context?.project ?? 'all',
    language: context?.language ?? 'all',
    machine: context?.machine ?? 'all',
  };
}

function AnalyticsInsightScoreCard({ label, score }: { label: string; score: InsightScore }) {
  return (
    <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--ink-strong)]">{label}</p>
          <p className="mt-1 text-xs text-[var(--ink-tertiary)]">
            {score.direction === 'lower-is-better' ? 'Lower is better' : 'Higher is better'}
          </p>
        </div>
        <p className="font-numeric text-2xl font-semibold text-[var(--ink-strong)]">
          {score.score}%
        </p>
      </div>
      {score.inputs.length ? (
        <details className="mt-3 rounded-xl bg-[var(--surface-pill)] px-3 py-2">
          <summary className="cursor-pointer text-xs font-medium text-[var(--ink-secondary)]">
            Inputs
          </summary>
          <div className="mt-2 grid gap-2">
            {score.inputs.map((input) => (
              <div key={input.label} className="flex items-center justify-between gap-3 text-xs">
                <span className="min-w-0 truncate text-[var(--ink-tertiary)]">{input.label}</span>
                <span className="font-numeric text-[var(--ink-strong)]">{input.score}%</span>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </article>
  );
}

export function AnalyticsPage() {
  const rangeTouchedRef = useRef(false);
  const [filters, setFilters] = useState<Filters>(() => resolveInitialAnalyticsFilters());
  const [isSessionDetailsOpen, setIsSessionDetailsOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionDetailRecord | null>(null);
  const { data: settingsData, hasResolvedOnce: hasResolvedSettings } = useDesktopResource({
    cacheKey: desktopResourceKeys.settings(),
    emptyValue: emptySettingsScreenData(),
    errorMessage: 'Unable to load desktop settings.',
    load: (options) => loadSettingsScreenData(options),
  });
  const {
    data: snapshot,
    isInitialLoading,
    loadError,
  } = useDesktopResource({
    cacheKey: desktopResourceKeys.analytics(filters),
    emptyValue: emptyAnalyticsSnapshot(filters),
    errorMessage: 'Unable to load analytics from persisted desktop data.',
    load: (options) => loadAnalyticsSnapshot(filters, options),
  });

  useEffect(() => {
    if (!hasResolvedSettings || rangeTouchedRef.current) {
      return;
    }

    const restoreLast = settingsData.viewModel.appBehavior.restoreLastSelectedDateRange;
    const restoreContext = settingsData.viewModel.appBehavior.reopenLastViewedContext;
    const saved = restoreLast ? readRangePreference(getRangeStorageKey('analytics')) : null;
    const savedContext = restoreContext ? readAnalyticsContextPreference() : null;
    setFilters((current) => ({
      ...current,
      range:
        saved?.range ?? normalizeOverviewRange(settingsData.viewModel.general.defaultDateRange),
      customRange: saved?.customRange ?? null,
      project: savedContext?.project ?? current.project,
      language: savedContext?.language ?? current.language,
      machine: savedContext?.machine ?? current.machine,
    }));
    rangeTouchedRef.current = true;
  }, [
    hasResolvedSettings,
    settingsData.viewModel.appBehavior.reopenLastViewedContext,
    settingsData.viewModel.appBehavior.restoreLastSelectedDateRange,
    settingsData.viewModel.general.defaultDateRange,
  ]);

  useEffect(() => {
    if (!rangeTouchedRef.current) {
      return;
    }
    saveRangePreference(
      getRangeStorageKey('analytics'),
      filters.range,
      filters.customRange ?? null,
    );
  }, [filters.customRange, filters.range]);

  useEffect(() => {
    if (!rangeTouchedRef.current) {
      return;
    }
    saveAnalyticsContextPreference({
      project: filters.project,
      language: filters.language,
      machine: filters.machine,
    });
  }, [filters.language, filters.machine, filters.project]);

  const handleFiltersChange = (next: Filters) => {
    rangeTouchedRef.current = true;
    setFilters(next);
  };

  const empty = snapshot.summary.totalMinutes === 0;
  const insightScoreCards = [
    { label: 'Momentum', score: snapshot.insightScores.momentumScore },
    { label: 'Focus', score: snapshot.insightScores.focusScore },
    { label: 'Consistency', score: snapshot.insightScores.consistencyScore },
    { label: 'Fragmentation', score: snapshot.insightScores.fragmentationScore },
    { label: 'Recovery', score: snapshot.insightScores.recoveryScore },
    { label: 'Tracking health', score: snapshot.insightScores.trackingHealthScore },
    { label: 'Project investment', score: snapshot.insightScores.projectInvestmentScore },
  ];
  const insightScoreChartData = insightScoreCards.map((item) => ({
    label: item.label,
    score: item.score.score,
  }));
  const activityGraphData = snapshot.time.daily.map((day) => ({
    date: day.date,
    count: day.minutes,
  }));

  const formatDetailDateTime = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openSessionDetails = (session: RecentSessionRow) => {
    setSelectedSession({
      id: session.id,
      project: session.project,
      language: session.language,
      durationMinutes: session.durationMinutes,
      startAt: formatDetailDateTime(session.start),
      machineName: session.machine,
      osLabel: session.osLabel,
      sessionCount: session.sessionCount,
      machineCount: session.machineCount,
      subSessions: session.subSessions.map((subSession) => ({
        id: subSession.id,
        language: subSession.language,
        durationMinutes: subSession.durationMinutes,
        startAt: formatDetailDateTime(subSession.start),
        endAt: formatDetailDateTime(subSession.end),
        machineName: subSession.machine,
        osLabel: subSession.osLabel,
      })),
    });
    setIsSessionDetailsOpen(true);
  };

  return (
    <div className="space-y-3">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-[var(--surface-strong)] p-3">
        <h1 className="text-2xl font-semibold text-[var(--ink-strong)]">Analytics</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full! border-[hsl(var(--border)/0.7)]"
            disabled
          >
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" className="rounded-full!" disabled>
            Share
          </Button>
        </div>
      </section>

      <section className="sticky top-3 z-10 rounded-[16px] bg-[var(--surface)]/92 p-3 shadow-[var(--shadow-inset-soft)] backdrop-blur">
        <AnalyticsFilters
          filters={filters}
          onChange={handleFiltersChange}
          projectOptions={snapshot.filters.projects}
          languageOptions={snapshot.filters.languages}
          machineOptions={SHOW_MULTI_MACHINE_UI ? snapshot.filters.machines : []}
          fallbackRange={normalizeOverviewRange(settingsData.viewModel.general.defaultDateRange)}
        />
      </section>

      {loadError ? (
        <section className="rounded-[16px] bg-[var(--surface)] p-3">
          <div className="rounded-[14px] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--ink-tertiary)]">
            {loadError}
          </div>
        </section>
      ) : null}

      {isInitialLoading && !loadError ? (
        <>
          <section className="space-y-3 rounded-[16px] bg-[var(--surface)] p-3">
            <div className="grid gap-3 md:grid-cols-6">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </section>
          <section className="space-y-3 rounded-[16px] bg-[var(--surface)] p-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
            </div>
          </section>
          <section className="space-y-3 rounded-[16px] bg-[var(--surface)] p-3">
            <div className="grid gap-3 lg:grid-cols-3">
              <Skeleton className="h-80 lg:col-span-2" />
              <Skeleton className="h-80" />
            </div>
          </section>
          <section className="space-y-3 rounded-[16px] bg-[var(--surface)] p-3">
            <Skeleton className="h-72" />
          </section>
        </>
      ) : null}

      {!isInitialLoading ? (
        <>
          <section className="space-y-3 rounded-[16px] bg-[var(--surface)] p-3">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Analytics summary</h2>
            {empty ? (
              <div className="rounded-[14px] bg-[var(--surface-muted)] p-4 text-[var(--ink-tertiary)]">
                No activity for this filter. Try a wider range or a different project.
              </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-6">
                  <AnalyticsKpiCard
                    label="Total time"
                    value={formatMinutes(snapshot.summary.totalMinutes)}
                  />
                  <AnalyticsKpiCard label="Active days" value={`${snapshot.summary.activeDays}`} />
                  <AnalyticsKpiCard label="Sessions" value={`${snapshot.summary.sessions}`} />
                <AnalyticsKpiCard
                  label="Avg session"
                  value={formatMinutes(snapshot.summary.averageSessionMinutes)}
                />
                <AnalyticsKpiCard
                  label="Deep work"
                  value={formatMinutes(snapshot.sessionKpis.deepWorkMinutes)}
                  hint={`${snapshot.sessionKpis.deepWorkBlockCount} blocks`}
                />
                <AnalyticsKpiCard
                  label="Consistency"
                  value={`${snapshot.sessionKpis.consistencyScore}%`}
                  hint={`${snapshot.sessionKpis.activeDays} active days`}
                />
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-[16px] bg-[var(--surface)] p-3">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Insight scores</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {insightScoreCards.map((item) => (
                <AnalyticsInsightScoreCard key={item.label} label={item.label} score={item.score} />
              ))}
            </div>
            <div className="grid gap-3 lg:grid-cols-3">
              <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)] lg:col-span-2">
                <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Score mix</h3>
                <div className="mt-2 h-72">
                  <KairosBarChart
                    data={insightScoreChartData}
                    index="label"
                    categories={['score']}
                    colors={[overviewChartPalette[2]]}
                    showLegend={false}
                    valueFormatter={(value) => `${value}%`}
                    tooltipValueFormatter={(value) => `${value}%`}
                    yAxisWidth={40}
                    rotateLabelX={{ angle: -25, xAxisHeight: 80 }}
                    height={260}
                  />
                </div>
              </article>
              <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
                <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Project investment</h3>
                <div className="mt-2 h-72">
                  {snapshot.insightScores.projectInvestmentBreakdown.length ? (
                    <KairosBarChart
                      data={snapshot.insightScores.projectInvestmentBreakdown.map((project) => ({
                        label: project.projectName,
                        score: project.score,
                      }))}
                      index="label"
                      categories={['score']}
                      colors={[overviewChartPalette[0]]}
                      showLegend={false}
                      valueFormatter={(value) => `${value}%`}
                      tooltipValueFormatter={(value) => `${value}%`}
                      yAxisWidth={40}
                      rotateLabelX={{ angle: -25, xAxisHeight: 80 }}
                      height={260}
                    />
                  ) : (
                    <p className="text-sm text-[var(--ink-tertiary)]">No project investment yet.</p>
                  )}
                </div>
              </article>
            </div>
          </section>

          <section className="space-y-3 rounded-[16px] bg-[var(--surface)] p-3">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Context</h2>
            <div className="grid gap-3 md:grid-cols-5">
              <AnalyticsKpiCard
                label="Project switches"
                value={`${snapshot.contextKpis.projectSwitchCount}`}
                hint={`${snapshot.contextKpis.projectSwitchRatePerDay}/day`}
              />
              <AnalyticsKpiCard
                label="Language switches"
                value={`${snapshot.contextKpis.languageSwitchCount}`}
                hint={`${snapshot.contextKpis.languageSwitchRatePerDay}/day`}
              />
              <AnalyticsKpiCard
                label="Project focus"
                value={`${snapshot.contextKpis.projectFocusScore}%`}
                hint={snapshot.contextKpis.topProjectByTime.name || 'No project'}
              />
              <AnalyticsKpiCard
                label="Language focus"
                value={`${snapshot.contextKpis.languageFocusScore}%`}
                hint={snapshot.contextKpis.topLanguageByTime.name || 'No language'}
              />
              <AnalyticsKpiCard
                label="Machine resumes"
                value={`${snapshot.contextKpis.crossMachineResumeCount}`}
                hint={`${snapshot.contextKpis.crossMachineResumeRate}%`}
              />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
                <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Project momentum</h3>
                <div className="mt-2 h-64">
                  {snapshot.contextKpis.projectMomentum.length === 0 ? (
                    <p className="text-sm text-[var(--ink-tertiary)]">No project momentum yet.</p>
                  ) : (
                    <KairosBarChart
                      data={snapshot.contextKpis.projectMomentum.map((item) => ({
                        label: item.name,
                        current: item.currentMinutes,
                        previous: item.previousMinutes,
                      }))}
                      index="label"
                      categories={['current', 'previous']}
                      colors={[overviewChartPalette[0], overviewChartPalette[1]]}
                      rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                      valueFormatter={(value) => formatDurationMinutes(Number(value), 'axis')}
                      tooltipValueFormatter={(value) =>
                        formatDurationMinutes(Number(value), 'long')
                      }
                      seriesLabels={{ current: 'Current 7d', previous: 'Previous 7d' }}
                      height={240}
                    />
                  )}
                </div>
              </article>
              <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
                <h3 className="text-sm font-semibold text-[var(--ink-strong)]">
                  Language momentum
                </h3>
                <div className="mt-2 h-64">
                  {snapshot.contextKpis.languageMomentum.length === 0 ? (
                    <p className="text-sm text-[var(--ink-tertiary)]">No language momentum yet.</p>
                  ) : (
                    <KairosBarChart
                      data={snapshot.contextKpis.languageMomentum.map((item) => ({
                        label: item.name,
                        current: item.currentMinutes,
                        previous: item.previousMinutes,
                      }))}
                      index="label"
                      categories={['current', 'previous']}
                      colors={[overviewChartPalette[3], overviewChartPalette[4]]}
                      rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                      valueFormatter={(value) => formatDurationMinutes(Number(value), 'axis')}
                      tooltipValueFormatter={(value) =>
                        formatDurationMinutes(Number(value), 'long')
                      }
                      seriesLabels={{ current: 'Current 7d', previous: 'Previous 7d' }}
                      height={240}
                    />
                  )}
                </div>
              </article>
            </div>
          </section>

          <section className="space-y-3 rounded-[16px] bg-[var(--surface)] p-3">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Activity rhythm</h2>
            {snapshot.eventKpis.eventsInSessions === 0 ? (
              <div className="rounded-[14px] bg-[var(--surface-muted)] p-4 text-[var(--ink-tertiary)]">
                {snapshot.eventKpis.trackEditEvents || snapshot.eventKpis.trackSaveEvents
                  ? 'No matched events for this range yet.'
                  : 'Enable edit or save tracking in Settings → Tracking to populate this section.'}
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-4">
                  <AnalyticsKpiCard
                    label="Event density"
                    value={`${snapshot.eventKpis.eventDensityPerMinute}/min`}
                    hint={`${snapshot.eventKpis.eventsInSessions} events in sessions`}
                  />
                  <AnalyticsKpiCard
                    label="Active share"
                    value={`${snapshot.eventKpis.activeShare}%`}
                    hint={`${snapshot.eventKpis.activeEventCount} edits + saves`}
                  />
                  <AnalyticsKpiCard
                    label="Edit / save ratio"
                    value={snapshot.eventKpis.saveCount === 0 ? '—' : `${snapshot.eventKpis.editSaveRatio}`}
                    hint={`${snapshot.eventKpis.editCount} edits · ${snapshot.eventKpis.saveCount} saves`}
                  />
                  <AnalyticsKpiCard
                    label="Heartbeat-only sessions"
                    value={`${snapshot.eventKpis.heartbeatOnlySessionCount}`}
                    hint={`${snapshot.eventKpis.heartbeatOnlySessionShare}%`}
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-4">
                  <AnalyticsKpiCard
                    label="Warm-up median"
                    value={snapshot.eventKpis.warmupQualifyingSessionCount === 0
                      ? '—'
                      : `${snapshot.eventKpis.medianSessionWarmupSeconds}s`}
                    hint={`${snapshot.eventKpis.warmupQualifyingSessionCount} qualifying sessions`}
                  />
                  <AnalyticsKpiCard
                    label="Edit → save median"
                    value={snapshot.eventKpis.medianEditToSaveSeconds === 0
                      ? '—'
                      : `${snapshot.eventKpis.medianEditToSaveSeconds}s`}
                  />
                  <AnalyticsKpiCard
                    label="Return after idle"
                    value={snapshot.eventKpis.medianReturnAfterIdleMinutes === 0
                      ? '—'
                      : `${snapshot.eventKpis.medianReturnAfterIdleMinutes}m`}
                    hint="median across same-day gaps"
                  />
                  <AnalyticsKpiCard
                    label="Activity bursts"
                    value={`${snapshot.eventKpis.activityBurstCount}`}
                    hint="≥5 active events in 5min"
                  />
                </div>
                {snapshot.eventKpis.eventTypeMixByProject.length > 0 ? (
                  <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
                    <h3 className="text-sm font-semibold text-[var(--ink-strong)]">
                      Event type mix by project
                    </h3>
                    <div className="mt-2 h-64">
                      <KairosBarChart
                        data={snapshot.eventKpis.eventTypeMixByProject.map((bucket) => ({
                          label: bucket.name,
                          edits: bucket.editCount,
                          saves: bucket.saveCount,
                          opens: bucket.openCount,
                          heartbeats: bucket.heartbeatCount,
                        }))}
                        index="label"
                        categories={['edits', 'saves', 'opens', 'heartbeats']}
                        colors={[
                          overviewChartPalette[0],
                          overviewChartPalette[1],
                          overviewChartPalette[2],
                          overviewChartPalette[3],
                        ]}
                        rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                        valueFormatter={(value) => `${value}`}
                        tooltipValueFormatter={(value) => `${value} events`}
                        seriesLabels={{
                          edits: 'Edits',
                          saves: 'Saves',
                          opens: 'Opens',
                          heartbeats: 'Heartbeats',
                        }}
                        height={240}
                      />
                    </div>
                  </article>
                ) : null}
              </>
            )}
          </section>

          <section className="space-y-3 rounded-[16px] bg-[var(--surface)] p-3">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Files</h2>
            {!snapshot.fileKpis.optInEnabled ? (
              <div className="rounded-[14px] bg-[var(--surface-muted)] p-4 text-[var(--ink-tertiary)]">
                Enable file metrics in Settings → Privacy to populate this section.
              </div>
            ) : !snapshot.fileKpis.filePathsAvailable ? (
              <div className="rounded-[14px] bg-[var(--surface-muted)] p-4 text-[var(--ink-tertiary)]">
                File path mode is set to Hidden. Switch to Masked or Full to compute file metrics.
              </div>
            ) : snapshot.fileKpis.uniqueFileCount === 0 ? (
              <div className="rounded-[14px] bg-[var(--surface-muted)] p-4 text-[var(--ink-tertiary)]">
                No file activity matched for this range yet.
              </div>
            ) : (
              <>
                {snapshot.fileKpis.pathsMasked ? (
                  <p className="text-xs text-[var(--ink-tertiary)]">
                    Showing filenames only — full paths are masked.
                  </p>
                ) : null}
                <div className="grid gap-3 md:grid-cols-4">
                  <AnalyticsKpiCard
                    label="Unique files"
                    value={`${snapshot.fileKpis.uniqueFileCount}`}
                    hint={`${snapshot.fileKpis.averageUniqueFilesPerSession} avg per session`}
                  />
                  <AnalyticsKpiCard
                    label="Test vs source"
                    value={
                      snapshot.fileKpis.testVsSource.sourceMinutes === 0 &&
                        snapshot.fileKpis.testVsSource.testMinutes === 0
                        ? '—'
                        : `${snapshot.fileKpis.testVsSource.testShareOfCode}%`
                    }
                    hint={`${formatMinutes(snapshot.fileKpis.testVsSource.testMinutes)} test · ${formatMinutes(snapshot.fileKpis.testVsSource.sourceMinutes)} source`}
                  />
                  <AnalyticsKpiCard
                    label="Documentation"
                    value={formatMinutes(snapshot.fileKpis.documentationMinutes)}
                  />
                  <AnalyticsKpiCard
                          label="Infrastructure"
                          value={formatMinutes(snapshot.fileKpis.infrastructureMinutes)}
                          hint={`${formatMinutes(snapshot.fileKpis.configMinutes)} config`}
                        />
                      </div>
                      <div className="grid gap-3 lg:grid-cols-2">
                        <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
                          <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Top files</h3>
                          {snapshot.fileKpis.topFiles.length === 0 ? (
                            <p className="text-sm text-[var(--ink-tertiary)]">No file totals yet.</p>
                          ) : (
                            <ul className="mt-2 space-y-2">
                              {snapshot.fileKpis.topFiles.map((file) => (
                                <li
                                  key={file.filePath}
                                  className="flex items-center justify-between gap-3 text-sm"
                                >
                                  <span className="truncate text-[var(--ink-strong)]" title={file.filePath}>
                                    {file.fileName}
                                  </span>
                                  <span className="text-[var(--ink-tertiary)]">
                                    {formatMinutes(file.totalMinutes)} · {file.eventCount} events
                                  </span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </article>
                        <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
                          <h3 className="text-sm font-semibold text-[var(--ink-strong)]">By category</h3>
                          <div className="mt-2 h-64">
                            {snapshot.fileKpis.categoryBreakdown.length === 0 ? (
                              <p className="text-sm text-[var(--ink-tertiary)]">No categories yet.</p>
                            ) : (
                              <KairosBarChart
                                data={snapshot.fileKpis.categoryBreakdown.map((entry) => ({
                                  label: entry.category,
                                  minutes: entry.totalMinutes,
                                }))}
                                index="label"
                                categories={['minutes']}
                                colors={[overviewChartPalette[0]]}
                                valueFormatter={(value) => formatDurationMinutes(Number(value), 'axis')}
                                tooltipValueFormatter={(value) =>
                                  formatDurationMinutes(Number(value), 'long')
                                }
                                seriesLabels={{ minutes: 'Minutes' }}
                                height={240}
                              />
                            )}
                          </div>
                        </article>
                      </div>
                      {snapshot.fileKpis.longRunningFocusBlocks.length > 0 ? (
                        <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
                          <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Focus blocks</h3>
                          <ul className="mt-2 space-y-2">
                            {snapshot.fileKpis.longRunningFocusBlocks.map((block) => (
                              <li
                                key={`${block.filePath}-${block.startTime}`}
                                className="flex items-center justify-between gap-3 text-sm"
                              >
                                <span className="truncate text-[var(--ink-strong)]" title={block.filePath}>
                                  {block.fileName}
                                </span>
                                <span className="text-[var(--ink-tertiary)]">
                                  {formatMinutes(block.durationMinutes)} · {block.eventCount} events
                                </span>
                              </li>
                            ))}
                          </ul>
                        </article>
                      ) : null}
                    </>
            )}
          </section>

          <section className="space-y-3 rounded-[16px] bg-[var(--surface)] p-3">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Time breakdown</h2>
            <div className="grid gap-3 md:grid-cols-4">
              <AnalyticsKpiCard
                label="Longest day"
                value={
                  snapshot.time.longestDay ? formatMinutes(snapshot.time.longestDay.minutes) : '—'
                }
                hint={snapshot.time.longestDay ? snapshot.time.longestDay.label : 'No active day'}
              />
              <AnalyticsKpiCard
                label="Avg per active day"
                value={formatMinutes(snapshot.time.averagePerActiveDay)}
                hint={`${snapshot.summary.activeDays} active days`}
              />
              <AnalyticsKpiCard
                label="Rolling 7d"
                value={formatMinutes(snapshot.sessionKpis.rolling7DayAverageMinutes)}
              />
              <AnalyticsKpiCard
                label="Rolling 30d"
                value={formatMinutes(snapshot.sessionKpis.rolling30DayAverageMinutes)}
              />
            </div>
            <AnalyticsTimeBreakdown
              daily={snapshot.time.daily}
              weekly={snapshot.time.weekly}
              range={filters.range}
            />
          </section>

          <section className="space-y-3 rounded-[16px] bg-[var(--surface)] p-3">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Projects</h2>
            <div className="grid gap-3 lg:grid-cols-3">
              <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)] lg:col-span-2">
                <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Time by project</h3>
                <div className="mt-2 h-64">
                  {snapshot.projects.items.length === 0 ? (
                    <p className="text-sm text-[var(--ink-tertiary)]">No project time yet.</p>
                  ) : (
                    <KairosBarChart
                        data={snapshot.projects.items.map((item) => ({
                          label: item.name,
                          minutes: item.minutes,
                        }))}
                        index="label"
                        categories={['minutes']}
                        colors={[overviewChartPalette[0]]}
                        rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                        showGridLines
                        valueFormatter={(value) => formatDurationMinutes(Number(value), 'axis')}
                      tooltipValueFormatter={(value) =>
                        formatDurationMinutes(Number(value), 'long')
                      }
                      seriesLabels={{ minutes: 'Time Spent' }}
                      height={240}
                    />
                  )}
                </div>
              </article>
              <AnalyticsDonut title="Project share" items={snapshot.projects.items} />
            </div>
            <AnalyticsBreakdownList
              title="Top projects"
              items={snapshot.projects.items}
              emptyMessage="No project time yet."
            />
          </section>

          <section className="space-y-3 rounded-[16px] bg-[var(--surface)] p-3">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Languages</h2>
            <div className="grid gap-3 lg:grid-cols-3">
              <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)] lg:col-span-2">
                <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Time by language</h3>
                <div className="mt-2 h-64">
                  {snapshot.languages.items.length === 0 ? (
                    <p className="text-sm text-[var(--ink-tertiary)]">No language time yet.</p>
                  ) : (
                    <KairosBarChart
                        data={snapshot.languages.items.map((item) => ({
                          label: item.name,
                          minutes: item.minutes,
                        }))}
                        index="label"
                        categories={['minutes']}
                        colors={[overviewChartPalette[3]]}
                        rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                        showGridLines
                        valueFormatter={(value) => formatDurationMinutes(Number(value), 'axis')}
                      tooltipValueFormatter={(value) =>
                        formatDurationMinutes(Number(value), 'long')
                      }
                      seriesLabels={{ minutes: 'Time Spent' }}
                      height={240}
                    />
                  )}
                </div>
              </article>
              <AnalyticsDonut title="Language share" items={snapshot.languages.items} />
            </div>
            <AnalyticsBreakdownList
              title="Top languages"
              items={snapshot.languages.items}
              emptyMessage="No language time yet."
              showLanguageIcons
            />
          </section>

          <section className="space-y-3 rounded-[16px] bg-[var(--surface)] p-3">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Sessions</h2>
            <div className="grid gap-3 md:grid-cols-5">
              <AnalyticsKpiCard
                label="Total sessions"
                value={`${snapshot.sessions.totalSessions}`}
              />
              <AnalyticsKpiCard
                label="Average session"
                value={formatMinutes(snapshot.sessions.averageSessionMinutes)}
              />
              <AnalyticsKpiCard
                label="Median session"
                value={formatMinutes(snapshot.sessionKpis.duration.medianMinutes)}
              />
              <AnalyticsKpiCard
                label="P90 session"
                value={formatMinutes(snapshot.sessionKpis.duration.p90Minutes)}
              />
              <AnalyticsKpiCard
                label="Longest session"
                value={formatMinutes(snapshot.sessions.longestSession)}
              />
            </div>
            <AnalyticsSessionsTable
              sessions={snapshot.sessions.recent}
              onRowSelect={openSessionDetails}
            />
          </section>

          {SHOW_MULTI_MACHINE_UI ? (
            <section className="space-y-3 rounded-[16px] bg-[var(--surface)] p-3">
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Machines</h2>
              <AnalyticsMachineList items={snapshot.machines.items} />
            </section>
          ) : null}

          <section className="space-y-3 rounded-[16px] bg-[var(--surface)] p-3">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Patterns</h2>
            <div className="grid gap-3 md:grid-cols-3">
              <AnalyticsKpiCard
                label="Most active day"
                value={snapshot.patterns.mostActiveDay ?? '—'}
              />
              <AnalyticsKpiCard
                label="Most active hour"
                value={snapshot.patterns.mostActiveHour ?? '—'}
              />
              <AnalyticsKpiCard
                label="Current streak"
                value={`${snapshot.sessionKpis.currentStreakDays} days`}
              />
              <AnalyticsKpiCard
                label="Longest streak"
                value={`${snapshot.sessionKpis.longestStreakDays} days`}
              />
              <AnalyticsKpiCard
                label="Focus window"
                value={
                  snapshot.sessionKpis.focusWindowStart && snapshot.sessionKpis.focusWindowEnd
                    ? `${snapshot.sessionKpis.focusWindowStart} - ${snapshot.sessionKpis.focusWindowEnd}`
                    : '—'
                }
              />
              <AnalyticsKpiCard
                label="Fragmentation"
                value={`${snapshot.sessionKpis.fragmentationScore}%`}
              />
              <AnalyticsKpiCard
                label="Longest break"
                value={formatMinutes(snapshot.sessionKpis.longestBreakMinutes)}
              />
              <AnalyticsKpiCard
                label="Best day"
                value={
                  snapshot.sessionKpis.bestDay.date
                    ? formatMinutes(snapshot.sessionKpis.bestDay.totalMinutes)
                    : '—'
                }
                hint={snapshot.sessionKpis.bestDay.label || 'No active day'}
              />
            </div>
            <article className="rounded-[14px]  p-3 shadow-[var(--shadow-inset-soft)] bg-[var(--surface-muted)]">
              <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Activity heatmap</h3>
              <div className="mt-3">
                <ActivityGraph data={activityGraphData} />
              </div>
            </article>
            <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
              <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Activity by hour</h3>
              <div className="mt-2 h-72">
                {snapshot.patterns.hourBuckets.length === 0 ? (
                  <p className="text-sm text-[var(--ink-tertiary)]">
                    No hourly data in this range.
                  </p>
                ) : (
                  <KairosBarChart
                    data={snapshot.patterns.hourBuckets.map((bucket) => ({
                      label: bucket.hourLabel,
                      minutes: bucket.minutes,
                    }))}
                    index="label"
                    categories={['minutes']}
                    colors={[overviewChartPalette[4]]}
                    showGridLines
                    valueFormatter={(value) => formatDurationMinutes(Number(value), 'axis')}
                    tooltipValueFormatter={(value) => formatDurationMinutes(Number(value), 'long')}
                    seriesLabels={{ minutes: 'Time Spent' }}
                    rotateLabelX={{ angle: -35, xAxisHeight: 90 }}
                    height={260}
                  />
                )}
              </div>
            </article>
          </section>

          {filters.range !== 'all-time' ? (
            <section className="space-y-3 rounded-[18px] bg-[var(--surface)] p-4">
              <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Period comparison</h2>
              <AnalyticsComparison snapshot={snapshot} />
            </section>
          ) : null}
        </>
      ) : null}

      <SessionDetailsDialog
        open={isSessionDetailsOpen}
        onOpenChange={setIsSessionDetailsOpen}
        session={selectedSession}
      />
    </div>
  );
}
