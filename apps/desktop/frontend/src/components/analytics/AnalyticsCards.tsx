import { KairosAreaChart, KairosBarChart, KairosDonutChart } from '@/components/charts/kairos-charts';
import { cn } from '@/lib/utils';
import { overviewChartPalette } from '@/components/overview/chart-colors';
import type { AnalyticsRange, BreakdownItem, DailyStat, MachineBreakdown } from '@/data/mockAnalytics';
import { LanguageIcon } from '@/lib/languageIcons';
import { formatDurationMinutes } from '@/lib/time-format';

export function formatMinutes(totalMinutes: number) {
  return formatDurationMinutes(totalMinutes, 'short');
}

type KpiProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'positive' | 'negative';
};

export function AnalyticsKpiCard({ label, value, hint, tone = 'neutral' }: KpiProps) {
  const toneClass =
    tone === 'positive'
      ? 'text-[var(--ink-positive)]'
      : tone === 'negative'
        ? 'text-[var(--ink-negative)]'
        : 'text-[var(--ink-strong)]';

  return (
    <article className="rounded-xl bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
      <p className="text-xs font-medium text-[var(--ink-secondary)]">{label}</p>
      <p className={cn('font-numeric mt-1 text-2xl font-semibold', toneClass)}>{value}</p>
      {hint ? <p className="text-xs text-[var(--ink-tertiary)]">{hint}</p> : null}
    </article>
  );
}

type BreakdownListProps = {
  title: string;
  items: BreakdownItem[];
  emptyMessage?: string;
  showLanguageIcons?: boolean;
};

export function AnalyticsBreakdownList({ title, items, emptyMessage, showLanguageIcons = false }: BreakdownListProps) {
  return (
    <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
      <h3 className="text-sm font-semibold text-[var(--ink-strong)]">{title}</h3>
      <div className="mt-3 gap-3 grid !grid-cols-3">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--ink-tertiary)]">{emptyMessage ?? 'No data for this filter.'}</p>
        ) : (
          items.map((item, index) => (
            <div
              key={item.name}
              className="flex items-center gap-3 rounded-lg bg-[var(--surface-subtle)] px-3 py-2"
            >
              <div className="grid size-8 place-items-center rounded-lg bg-[var(--surface-pill)] text-xs font-semibold text-[var(--ink-accent)]">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--ink-strong)] inline-flex items-center gap-2">
                  {showLanguageIcons ? <LanguageIcon language={item.name} size={16} /> : null}
                  <span className="truncate">{item.name}</span>
                </p>
                <p className="text-xs text-[var(--ink-tertiary)]">
                  {formatMinutes(item.minutes)} · {item.share}% · {item.activeDays} active days
                </p>
              </div>
              <p className="text-xs text-[var(--ink-secondary)]">{item.recent}</p>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

type TimeListProps = {
  daily: DailyStat[];
  weekly: Array<{ label: string; minutes: number }>;
  range: AnalyticsRange;
};

export function resolveTrendPresentation(
  range: AnalyticsRange,
  daily: DailyStat[],
  weekly: Array<{ label: string; minutes: number }>,
) {
  const dailyData = daily.map((day) => ({ label: day.label, minutes: day.minutes }));
  const trendTitle = range === 'week'
    ? 'Weekly trend'
    : range === 'month'
      ? 'Monthly trend'
      : range === 'today'
        ? 'Today trend'
        : 'Custom trend';
  const trendData = range === 'week' ? weekly : dailyData;
  const maxVisibleTicks = range === 'month' ? 9 : range === 'custom' ? 8 : range === 'today' ? 8 : trendData.length;
  const tickStep = trendData.length === 0
    ? 1
    : Math.max(1, Math.ceil(trendData.length / Math.max(1, maxVisibleTicks)));

  return {
    dailyData,
    trendData,
    trendTitle,
    tickStep,
  };
}

export function AnalyticsTimeBreakdown({ daily, weekly, range }: TimeListProps) {
  const { dailyData, trendData, trendTitle, tickStep } = resolveTrendPresentation(range, daily, weekly);

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
        <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Daily totals</h3>
        <div className="mt-2 h-60">
          {daily.length === 0 ? (
            <p className="text-sm text-[var(--ink-tertiary)]">No sessions in range.</p>
          ) : (
            <KairosBarChart
              data={dailyData}
              index="label"
              categories={['minutes']}
              colors={[overviewChartPalette[0]]}
              showGridLines
              valueFormatter={(value) => formatDurationMinutes(Number(value), 'axis')}
              tooltipValueFormatter={(value) => formatDurationMinutes(Number(value), 'long')}
              seriesLabels={{ minutes: 'Total Time' }}
              rotateLabelX={{ angle: -25, xAxisHeight: 60 }}
              height={224}
            />
          )}
        </div>
      </article>
      <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
        <h3 className="text-sm font-semibold text-[var(--ink-strong)]">{trendTitle}</h3>
        <div className="mt-2 h-60">
          {trendData.length === 0 ? (
            <p className="text-sm text-[var(--ink-tertiary)]">No sessions in range.</p>
          ) : (
            <KairosAreaChart
              data={trendData}
              index="label"
              categories={['minutes']}
              colors={[overviewChartPalette[1]]}
              height={224}
              showGridLines
              xTickFormatter={(label, index) => (index % tickStep === 0 ? String(label) : '')}
              valueFormatter={(value) => formatDurationMinutes(Number(value), 'axis')}
              tooltipValueFormatter={(value) => formatDurationMinutes(Number(value), 'long')}
              seriesLabels={{ minutes: 'Total Time' }}
            />
          )}
        </div>
      </article>
    </div>
  );
}

type MachineListProps = { items: MachineBreakdown[] };

export function AnalyticsMachineList({ items }: MachineListProps) {
  return (
    <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
      <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Machines</h3>
      <div className="mt-3">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--ink-tertiary)]">No machine activity in this range.</p>
        ) : (
          <KairosBarChart
            data={items.map((item) => ({ label: item.name, minutes: item.minutes }))}
            index="label"
            categories={['minutes']}
            colors={[overviewChartPalette[2]]}
            showGridLines
            valueFormatter={(value) => formatDurationMinutes(Number(value), 'axis')}
            tooltipValueFormatter={(value) => formatDurationMinutes(Number(value), 'long')}
            seriesLabels={{ minutes: 'Total Time' }}
            height={240}
          />
        )}
      </div>
    </article>
  );
}

export function AnalyticsDonut({
  title,
  items,
}: {
  title: string;
  items: BreakdownItem[];
}) {
  return (
    <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
      <h3 className="text-sm font-semibold text-[var(--ink-strong)]">{title}</h3>
      <div className="mt-2 h-56">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--ink-tertiary)]">No data for this filter.</p>
        ) : (
          <KairosDonutChart
            data={items}
            index="name"
            category="share"
            colors={items.map((_, idx) => overviewChartPalette[idx % overviewChartPalette.length])}
            valueFormatter={(value) => `${value}%`}
            showLegend
            height={200}
          />
        )}
      </div>
    </article>
  );
}
