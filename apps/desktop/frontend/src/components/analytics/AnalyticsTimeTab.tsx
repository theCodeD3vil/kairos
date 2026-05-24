import { ActivityGraph } from '@/components/activity-graph';
import { KairosBarChart } from '@/components/charts/kairos-charts';
import {
  AnalyticsKpiCard,
  AnalyticsTimeBreakdown,
  formatMinutes,
} from '@/components/analytics/AnalyticsCards';
import { overviewChartPalette } from '@/components/overview/chart-colors';
import type { AnalyticsFilters, AnalyticsSnapshot } from '@/data/mockAnalytics';
import { formatDurationMinutes } from '@/lib/time-format';

interface AnalyticsTimeTabProps {
  snapshot: AnalyticsSnapshot;
  filters: AnalyticsFilters;
}

export function AnalyticsTimeTab({ snapshot, filters }: AnalyticsTimeTabProps) {
  const activityGraphData = snapshot.time.daily.map((day) => ({
    date: day.date,
    count: day.minutes,
  }));

  const hourBuckets = snapshot.patterns.hourBuckets ?? [];

  return (
    <div className="space-y-6">
      {/* Time breakdown */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
          Time breakdown
        </h2>
        <div className="grid gap-3 md:grid-cols-4">
          <AnalyticsKpiCard
            label="Longest day"
            value={
              snapshot.time.longestDay
                ? formatMinutes(snapshot.time.longestDay.minutes)
                : '—'
            }
            hint={
              snapshot.time.longestDay
                ? snapshot.time.longestDay.label
                : 'No active day'
            }
          />
          <AnalyticsKpiCard
            label="Avg per active day"
            value={formatMinutes(snapshot.time.averagePerActiveDay)}
            hint={`${snapshot.summary.activeDays} active days`}
          />
          <AnalyticsKpiCard
            label="7-day average"
            value={formatMinutes(snapshot.sessionKpis.rolling7DayAverageMinutes)}
          />
          <AnalyticsKpiCard
            label="30-day average"
            value={formatMinutes(snapshot.sessionKpis.rolling30DayAverageMinutes)}
          />
        </div>
        <AnalyticsTimeBreakdown
          daily={snapshot.time.daily}
          weekly={snapshot.time.weekly}
          range={filters.range}
        />
      </section>

      {/* Activity by time */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
          Activity by time
        </h2>
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
            label="Earliest start"
            value={snapshot.sessionKpis.focusWindowStart ?? '—'}
          />
          <AnalyticsKpiCard
            label="Latest end"
            value={snapshot.sessionKpis.focusWindowEnd ?? '—'}
          />
          <AnalyticsKpiCard
            label="Short sessions"
            value={`${snapshot.sessionKpis.shortSessionCount}`}
            hint={`Under ${snapshot.sessionKpis.shortSessionThresholdMinutes}m`}
          />
          <AnalyticsKpiCard
            label="Longest break"
            value={formatMinutes(snapshot.sessionKpis.longestBreakMinutes)}
          />
          <AnalyticsKpiCard
            label="Highest time day"
            value={
              snapshot.sessionKpis.bestDay.date
                ? formatMinutes(snapshot.sessionKpis.bestDay.totalMinutes)
                : '—'
            }
            hint={snapshot.sessionKpis.bestDay.label || 'No active day'}
          />
        </div>

        {/* Activity heatmap */}
        <article className="rounded-[14px] p-3 shadow-[var(--shadow-inset-soft)] bg-[var(--surface-muted)]">
          <h3 className="text-sm font-semibold text-[var(--ink-strong)]">
            Activity heatmap
          </h3>
          <div className="mt-3">
            <ActivityGraph data={activityGraphData} />
          </div>
        </article>

        {/* Activity by hour */}
        <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
          <h3 className="text-sm font-semibold text-[var(--ink-strong)]">
            Activity by hour
          </h3>
          <div className="mt-2 h-72">
            {hourBuckets.length === 0 ? (
              <p className="text-sm text-[var(--ink-tertiary)]">
                No hourly data in this range.
              </p>
            ) : (
              <KairosBarChart
                data={hourBuckets.map(
                  (b: { hourLabel: string; minutes: number }) => ({
                    label: b.hourLabel,
                    minutes: b.minutes,
                  }),
                )}
                index="label"
                categories={['minutes']}
                colors={[overviewChartPalette[4]]}
                showGridLines
                valueFormatter={(v: number) =>
                  formatDurationMinutes(v, 'axis')
                }
                tooltipValueFormatter={(v: number) =>
                  formatDurationMinutes(v, 'long')
                }
                seriesLabels={{ minutes: 'Time Spent' }}
                rotateLabelX={{ angle: -35, xAxisHeight: 90 }}
                height={260}
              />
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
