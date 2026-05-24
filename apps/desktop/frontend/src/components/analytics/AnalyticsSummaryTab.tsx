import { KairosAreaChart } from '@/components/charts/kairos-charts';
import {
  AnalyticsKpiCard,
  formatMinutes,
  mapCumulativeAverageSparklineData,
  resolveTrendPresentation,
} from '@/components/analytics/AnalyticsCards';
import { overviewChartPalette } from '@/components/overview/chart-colors';
import { LanguageIcon } from '@/lib/languageIcons';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';
import { formatDurationMinutes } from '@/lib/time-format';
import type { AnalyticsFilters, AnalyticsSnapshot, RecentSessionRow } from '@/data/mockAnalytics';

interface AnalyticsSummaryTabProps {
  snapshot: AnalyticsSnapshot;
  filters: AnalyticsFilters;
  onSessionSelect: (session: RecentSessionRow) => void;
}

export function AnalyticsSummaryTab({
  snapshot,
  filters,
  onSessionSelect,
}: AnalyticsSummaryTabProps) {
  const { trendData, trendTitle, tickStep } = resolveTrendPresentation(
    filters.range,
    snapshot.time.daily,
    snapshot.time.weekly
  );
  const totalTimeSparklineData = trendData.map((point) => ({
    day: String(point.label),
    label: String(point.label),
    value: point.minutes,
  }));
  const averagePerActiveDaySparklineData = mapCumulativeAverageSparklineData(snapshot.time.daily);

  return (
    <div className="space-y-6">
      {/* ── Summary Cards Grid ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Summary</h2>
        {snapshot.summary.totalMinutes === 0 ? (
          <div className="rounded-[14px] bg-[var(--surface-muted)] p-4 text-[var(--ink-tertiary)]">
            No activity for this filter. Try a wider range or a different project.
          </div>
        ) : (
            <div className="grid gap-3 md:grid-cols-3">
            <AnalyticsKpiCard
              label="Total time"
              value={formatMinutes(snapshot.summary.totalMinutes)}
                sparkline={{
                  data: totalTimeSparklineData,
                  variant: 'area',
                  color: overviewChartPalette[1],
                  showBaseline: true,
                }}
            />
            <AnalyticsKpiCard
              label="Avg per active day"
              value={formatMinutes(snapshot.time.averagePerActiveDay)}
              hint={`${snapshot.summary.activeDays} active days`}
                sparkline={{
                  data: averagePerActiveDaySparklineData,
                  variant: 'line',
                  color: overviewChartPalette[0],
                  showBaseline: true,
                }}
            />
              <div className="grid gap-3">
                <AnalyticsKpiCard
                  label="Top project"
                  value={snapshot.projects.topProject ?? '—'}
                />
                <AnalyticsKpiCard
                  label="Top language"
                  value={snapshot.languages.topLanguage ?? '—'}
                />
              </div>
            <AnalyticsKpiCard
              label="Sessions"
              value={`${snapshot.summary.sessions}`}
            />
            <AnalyticsKpiCard
              label="Avg session"
              value={formatMinutes(snapshot.summary.averageSessionMinutes)}
            />
              <AnalyticsKpiCard
                label="Unique Files"
                value={snapshot.fileKpis.uniqueFileCount.toString()}
              />
          </div>
        )}
      </section>

      {/* ── Coding Time Trend ── */}
      {snapshot.summary.totalMinutes > 0 && (
        <section className="space-y-3">
          <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
            <h3 className="text-sm font-semibold text-[var(--ink-strong)]">{trendTitle}</h3>
            <div className="mt-2 h-64">
              {trendData.length === 0 ? (
                <p className="text-sm text-[var(--ink-tertiary)]">No sessions in range.</p>
              ) : (
                <KairosAreaChart
                  data={trendData}
                  index="label"
                  categories={['minutes']}
                  colors={[overviewChartPalette[1]]}
                  height={240}
                  showGridLines
                  xTickFormatter={(label, index) => (index % tickStep === 0 ? String(label) : '')}
                  valueFormatter={(value) => formatDurationMinutes(Number(value), 'axis')}
                  tooltipValueFormatter={(value) => formatDurationMinutes(Number(value), 'long')}
                  seriesLabels={{ minutes: 'Total Time' }}
                />
              )}
            </div>
          </article>
        </section>
      )}

      {/* ── Top Projects & Recent Sessions ── */}
      {snapshot.summary.totalMinutes > 0 && (
        <section className="grid gap-3 lg:grid-cols-2">
          {/* Top Projects */}
          <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)] flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Top Projects</h3>
              <div className="mt-3 space-y-2">
                {snapshot.projects.items.length === 0 ? (
                  <p className="text-sm text-[var(--ink-tertiary)]">No project time yet.</p>
                ) : (
                  snapshot.projects.items.slice(0, 5).map((project, index) => (
                    <div
                      key={project.name}
                      className="flex items-center gap-3 rounded-lg bg-[var(--surface-subtle)] px-3 py-2"
                    >
                      <div className="grid size-8 place-items-center rounded-lg bg-[var(--surface-pill)] text-xs font-semibold text-[var(--ink-accent)]">
                        {index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--ink-strong)]">
                          {project.name}
                        </p>
                        <p className="text-xs text-[var(--ink-tertiary)]">
                          {formatMinutes(project.minutes)} · {project.share}% · {project.activeDays} active days
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </article>

          {/* Recent Sessions */}
          <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)] flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Recent Sessions</h3>
              <div className="mt-3 space-y-2">
                {snapshot.sessions.recent.length === 0 ? (
                  <p className="text-sm text-[var(--ink-tertiary)]">No recent sessions.</p>
                ) : (
                  snapshot.sessions.recent.slice(0, 5).map((session) => (
                    <div
                      key={session.id}
                      onClick={() => onSessionSelect(session)}
                      className="flex items-center justify-between gap-3 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 cursor-pointer hover:bg-[var(--surface-chip)] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-[var(--ink-strong)]">
                          {session.project}
                        </p>
                        <p className="text-xs text-[var(--ink-tertiary)] inline-flex items-center gap-1.5 mt-0.5">
                          {session.language && !session.language.startsWith('Mixed') ? (
                            <span className="inline-flex items-center gap-1">
                              <LanguageIcon language={session.language} size={12} />
                              {session.language}
                            </span>
                          ) : session.language ? (
                            session.language
                          ) : null}
                          <span className="text-[var(--ink-tertiary)]">
                            · {session.dayLabel} at {new Date(session.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-[var(--ink-strong)]">
                          {formatMinutes(session.durationMinutes)}
                        </p>
                        {SHOW_MULTI_MACHINE_UI && (
                          <p className="text-[10px] text-[var(--ink-tertiary)] truncate max-w-[80px]">
                            {session.machine}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </article>
        </section>
      )}
    </div>
  );
}
