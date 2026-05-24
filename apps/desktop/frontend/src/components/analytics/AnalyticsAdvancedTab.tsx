import { KairosBarChart } from '@/components/charts/kairos-charts';
import {
  AnalyticsKpiCard,
  formatMinutes,
} from '@/components/analytics/AnalyticsCards';
import { AnalyticsComparison } from '@/components/analytics/AnalyticsComparison';
import { overviewChartPalette } from '@/components/overview/chart-colors';
import type { AnalyticsFilters, AnalyticsSnapshot, InsightScore } from '@/data/mockAnalytics';

interface AnalyticsAdvancedTabProps {
  snapshot: AnalyticsSnapshot;
  filters: AnalyticsFilters;
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

export function AnalyticsAdvancedTab({ snapshot, filters }: AnalyticsAdvancedTabProps) {
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

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Analytics summary</h2>
        {snapshot.summary.totalMinutes === 0 ? (
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

      <section className="space-y-3">
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

      {filters.range !== 'all-time' ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Period comparison</h2>
          <AnalyticsComparison snapshot={snapshot} />
        </section>
      ) : null}
    </div>
  );
}
