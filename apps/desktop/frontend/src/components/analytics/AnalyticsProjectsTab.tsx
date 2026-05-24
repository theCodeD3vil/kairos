import { KairosBarChart } from '@/components/charts/kairos-charts';
import {
  AnalyticsBreakdownList,
  AnalyticsDonut,
  AnalyticsKpiCard,
  formatMinutes,
} from '@/components/analytics/AnalyticsCards';
import { overviewChartPalette } from '@/components/overview/chart-colors';
import type { AnalyticsSnapshot } from '@/data/mockAnalytics';
import { formatDurationMinutes } from '@/lib/time-format';

interface AnalyticsProjectsTabProps {
  snapshot: AnalyticsSnapshot;
}

export function AnalyticsProjectsTab({ snapshot }: AnalyticsProjectsTabProps) {
  return (
    <div className="space-y-6">
      {/* ── Projects ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Projects</h2>

        <div className="grid gap-3 lg:grid-cols-3">
          <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)] lg:col-span-2">
            <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Time by project</h3>
            <div className="mt-2 h-64">
              {snapshot.projects.items.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">No project time yet.</p>
              ) : (
                <KairosBarChart
                  data={snapshot.projects.items.map((p) => ({
                    label: p.name,
                    minutes: p.minutes,
                  }))}
                  index="label"
                  categories={['minutes']}
                  colors={[overviewChartPalette[0]]}
                  rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                  showGridLines
                  valueFormatter={(v) => formatDurationMinutes(Number(v), 'axis')}
                  tooltipValueFormatter={(v) => formatDurationMinutes(Number(v), 'long')}
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

      {/* ── Languages ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Languages</h2>

        <div className="grid gap-3 lg:grid-cols-3">
          <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)] lg:col-span-2">
            <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Time by language</h3>
            <div className="mt-2 h-64">
              {snapshot.languages.items.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">No language time yet.</p>
              ) : (
                <KairosBarChart
                  data={snapshot.languages.items.map((l) => ({
                    label: l.name,
                    minutes: l.minutes,
                  }))}
                  index="label"
                  categories={['minutes']}
                  colors={[overviewChartPalette[3]]}
                  rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                  showGridLines
                  valueFormatter={(v) => formatDurationMinutes(Number(v), 'axis')}
                  tooltipValueFormatter={(v) => formatDurationMinutes(Number(v), 'long')}
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

      {/* ── Context ── */}
      <section className="space-y-3">
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
                <p className="text-sm text-[var(--ink-muted)]">No project momentum yet.</p>
              ) : (
                <KairosBarChart
                  data={snapshot.contextKpis.projectMomentum.map((p) => ({
                    label: p.name,
                    current: p.currentMinutes,
                    previous: p.previousMinutes,
                  }))}
                  index="label"
                  categories={['current', 'previous']}
                  colors={[overviewChartPalette[0], overviewChartPalette[1]]}
                  rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                  valueFormatter={(v) => formatDurationMinutes(Number(v), 'axis')}
                  tooltipValueFormatter={(v) => formatDurationMinutes(Number(v), 'long')}
                  seriesLabels={{ current: 'Current 7d', previous: 'Previous 7d' }}
                  height={240}
                />
              )}
            </div>
          </article>

          <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
            <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Language momentum</h3>
            <div className="mt-2 h-64">
              {snapshot.contextKpis.languageMomentum.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">No language momentum yet.</p>
              ) : (
                <KairosBarChart
                  data={snapshot.contextKpis.languageMomentum.map((l) => ({
                    label: l.name,
                    current: l.currentMinutes,
                    previous: l.previousMinutes,
                  }))}
                  index="label"
                  categories={['current', 'previous']}
                  colors={[overviewChartPalette[3], overviewChartPalette[4]]}
                  rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                  valueFormatter={(v) => formatDurationMinutes(Number(v), 'axis')}
                  tooltipValueFormatter={(v) => formatDurationMinutes(Number(v), 'long')}
                  seriesLabels={{ current: 'Current 7d', previous: 'Previous 7d' }}
                  height={240}
                />
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
