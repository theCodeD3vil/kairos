import { useEffect, useRef, useState } from 'react';
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
import { SessionDetailsDialog, type SessionDetailRecord } from '@/components/sessions/SessionDetailsDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { desktopResourceKeys } from '@/app/DesktopDataContext';
import type { AnalyticsFilters as Filters, RecentSessionRow } from '@/data/mockAnalytics';
import { emptyAnalyticsSnapshot, loadAnalyticsSnapshot } from '@/lib/backend/page-data';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';
import { useDesktopResource } from '@/lib/hooks/useDesktopResource';
import { emptySettingsScreenData, loadSettingsScreenData } from '@/lib/backend/settings';
import { normalizeOverviewRange } from '@/components/overview/types';
import {
  getRangeStorageKey,
  readAnalyticsContextPreference,
  readRangePreference,
  saveAnalyticsContextPreference,
  saveRangePreference,
} from '@/lib/settings/preferences';
import { formatDurationMinutes } from '@/lib/time-format';

const analyticsDefaultFilters: Filters = {
  range: 'week',
  customRange: null,
  project: 'all',
  language: 'all',
  machine: 'all',
};

export function AnalyticsPage() {
  const rangeTouchedRef = useRef(false);
  const [filters, setFilters] = useState<Filters>(analyticsDefaultFilters);
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
      range: saved?.range ?? normalizeOverviewRange(settingsData.viewModel.general.defaultDateRange),
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
    saveRangePreference(getRangeStorageKey('analytics'), filters.range, filters.customRange ?? null);
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
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full!"
            disabled
          >
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
            <div className="grid gap-3 md:grid-cols-5">
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
          <div className="grid gap-3 md:grid-cols-5">
            <AnalyticsKpiCard label="Total time" value={formatMinutes(snapshot.summary.totalMinutes)} />
            <AnalyticsKpiCard label="Active days" value={`${snapshot.summary.activeDays}`} />
            <AnalyticsKpiCard label="Sessions" value={`${snapshot.summary.sessions}`} />
            <AnalyticsKpiCard label="Avg session" value={formatMinutes(snapshot.summary.averageSessionMinutes)} />
            <AnalyticsKpiCard
              label="Longest session"
              value={formatMinutes(snapshot.sessions.longestSession)}
              hint="Top duration in range"
            />
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-[16px] bg-[var(--surface)] p-3">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Time breakdown</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <AnalyticsKpiCard
            label="Longest day"
            value={snapshot.time.longestDay ? formatMinutes(snapshot.time.longestDay.minutes) : '—'}
            hint={snapshot.time.longestDay ? snapshot.time.longestDay.label : 'No active day'}
          />
          <AnalyticsKpiCard
            label="Avg per active day"
            value={formatMinutes(snapshot.time.averagePerActiveDay)}
            hint={`${snapshot.summary.activeDays} active days`}
          />
        </div>
        <AnalyticsTimeBreakdown daily={snapshot.time.daily} weekly={snapshot.time.weekly} range={filters.range} />
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
                  data={snapshot.projects.items.map((item) => ({ label: item.name, minutes: item.minutes }))}
                  index="label"
                  categories={['minutes']}
                  colors={[overviewChartPalette[0]]}
                  rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                  showGridLines
                  valueFormatter={(value) => formatDurationMinutes(Number(value), 'axis')}
                  tooltipValueFormatter={(value) => formatDurationMinutes(Number(value), 'long')}
                  seriesLabels={{ minutes: 'Time Spent' }}
                  height={240}
                />
              )}
            </div>
          </article>
          <AnalyticsDonut title="Project share" items={snapshot.projects.items} />
        </div>
        <AnalyticsBreakdownList title="Top projects" items={snapshot.projects.items} emptyMessage="No project time yet." />
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
                  data={snapshot.languages.items.map((item) => ({ label: item.name, minutes: item.minutes }))}
                  index="label"
                  categories={['minutes']}
                  colors={[overviewChartPalette[3]]}
                  rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                  showGridLines
                  valueFormatter={(value) => formatDurationMinutes(Number(value), 'axis')}
                  tooltipValueFormatter={(value) => formatDurationMinutes(Number(value), 'long')}
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
        <div className="grid gap-3 md:grid-cols-3">
          <AnalyticsKpiCard label="Total sessions" value={`${snapshot.sessions.totalSessions}`} />
          <AnalyticsKpiCard label="Average session" value={formatMinutes(snapshot.sessions.averageSessionMinutes)} />
          <AnalyticsKpiCard label="Longest session" value={formatMinutes(snapshot.sessions.longestSession)} />
        </div>
        <AnalyticsSessionsTable sessions={snapshot.sessions.recent} onRowSelect={openSessionDetails} />
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
          <AnalyticsKpiCard label="Most active day" value={snapshot.patterns.mostActiveDay ?? '—'} />
          <AnalyticsKpiCard label="Most active hour" value={snapshot.patterns.mostActiveHour ?? '—'} />
          <AnalyticsKpiCard label="Active streak" value={`${snapshot.patterns.streakDays} days`} />
        </div>
        <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
          <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Activity by hour</h3>
          <div className="mt-2 h-72">
            {snapshot.patterns.hourBuckets.length === 0 ? (
              <p className="text-sm text-[var(--ink-tertiary)]">No hourly data in this range.</p>
            ) : (
              <KairosBarChart
                data={snapshot.patterns.hourBuckets.map((bucket) => ({ label: bucket.hourLabel, minutes: bucket.minutes }))}
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

          <section className="space-y-3 rounded-[18px] bg-[var(--surface)] p-4">
            <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Period comparison</h2>
            <AnalyticsComparison snapshot={snapshot} />
          </section>
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
