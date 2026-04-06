import { useState } from 'react';
import { BarChart } from '@lobehub/charts';
import { useToast } from '@/components/toast/ToastProvider';
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
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { desktopResourceKeys } from '@/app/DesktopDataContext';
import type { AnalyticsFilters as Filters } from '@/data/mockAnalytics';
import { emptyAnalyticsSnapshot, loadAnalyticsSnapshot } from '@/lib/backend/page-data';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';
import { useDesktopResource } from '@/lib/hooks/useDesktopResource';

const analyticsDefaultFilters: Filters = {
  range: 'week',
  customRange: null,
  project: 'all',
  language: 'all',
  machine: 'all',
};

export function AnalyticsPage() {
  const { info } = useToast();
  const [filters, setFilters] = useState<Filters>(analyticsDefaultFilters);
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

  const empty = snapshot.summary.totalMinutes === 0;

  return (
    <div className="space-y-3">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-[var(--surface-strong)] p-3">
        <h1 className="text-2xl font-semibold text-[var(--ink-strong)]">Analytics</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full! border-black/10"
            onClick={() => info('Export CSV', 'Export is deferred for a later desktop release.')}
          >
            Export CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="rounded-full!"
            onClick={() => info('Share', 'Sharing is not part of the local-first v1 desktop release.')}
          >
            Share
          </Button>
        </div>
      </section>

      <section className="sticky top-3 z-10 rounded-[16px] bg-[var(--surface)]/92 p-3 shadow-[var(--shadow-inset-soft)] backdrop-blur">
        <AnalyticsFilters
          filters={filters}
          onChange={setFilters}
          projectOptions={snapshot.filters.projects}
          languageOptions={snapshot.filters.languages}
          machineOptions={SHOW_MULTI_MACHINE_UI ? snapshot.filters.machines : []}
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
        <AnalyticsTimeBreakdown daily={snapshot.time.daily} weekly={snapshot.time.weekly} />
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
                <BarChart
                  data={snapshot.projects.items.map((item) => ({ label: item.name, minutes: item.minutes }))}
                  index="label"
                  categories={['minutes']}
                  colors={[overviewChartPalette[0]]}
                  showAnimation
                  animationDuration={900}
                  rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                  showGridLines
                  valueFormatter={(value) => formatMinutes(Number(value))}
                  yAxisWidth={44}
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
                <BarChart
                  data={snapshot.languages.items.map((item) => ({ label: item.name, minutes: item.minutes }))}
                  index="label"
                  categories={['minutes']}
                  colors={[overviewChartPalette[3]]}
                  showAnimation
                  animationDuration={900}
                  rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                  showGridLines
                  valueFormatter={(value) => formatMinutes(Number(value))}
                  yAxisWidth={44}
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
        <AnalyticsSessionsTable sessions={snapshot.sessions.recent} />
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
              <BarChart
                data={snapshot.patterns.hourBuckets.map((bucket) => ({ label: bucket.hourLabel, minutes: bucket.minutes }))}
                index="label"
                categories={['minutes']}
                colors={[overviewChartPalette[4]]}
                showAnimation
                animationDuration={900}
                showGridLines
                valueFormatter={(value) => formatMinutes(Number(value))}
                yAxisWidth={44}
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
    </div>
  );
}
