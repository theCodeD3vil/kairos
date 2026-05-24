import { KairosAreaChart, KairosBarChart, KairosDonutChart } from '@/components/charts/kairos-charts';
import { cn } from '@/lib/utils';
import { overviewChartPalette } from '@/components/overview/chart-colors';
import type { AnalyticsRange, BreakdownItem, DailyStat, MachineBreakdown } from '@/data/mockAnalytics';
import { LanguageIcon } from '@/lib/languageIcons';
import { formatDurationMinutes } from '@/lib/time-format';
import type { ComponentProps, ReactNode } from 'react';

export function formatMinutes(totalMinutes: number) {
  return formatDurationMinutes(totalMinutes, 'short');
}

type KpiProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'positive' | 'negative';
  sparkline?: MetricSparklineProps;
};

export type MetricSparklinePoint = {
  day: string;
  label?: string;
  value: number;
};

export type MetricSparklineVariant = 'line' | 'area' | 'bar';

export interface MetricSparklineProps extends ComponentProps<'div'> {
  data: MetricSparklinePoint[];
  variant?: MetricSparklineVariant;
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  showEndpoint?: boolean;
  showLabel?: boolean;
  showTrend?: boolean;
  showDateRange?: boolean;
  showBaseline?: boolean;
  valueFormatter?: (value: number) => string;
}

export function mapDailyMinutesSparklineData(daily: DailyStat[]): MetricSparklinePoint[] {
  return daily.map((day) => ({
    day: day.date,
    label: day.label,
    value: day.minutes,
  }));
}

export function mapCumulativeAverageSparklineData(daily: DailyStat[]): MetricSparklinePoint[] {
  let runningTotal = 0;

  return daily.map((day, index) => {
    runningTotal += day.minutes;

    return {
      day: day.date,
      label: day.label,
      value: Math.round(runningTotal / (index + 1)),
    };
  });
}

export function mapRollingAverageSparklineData(
  daily: DailyStat[],
  windowSize: number,
): MetricSparklinePoint[] {
  return daily.map((day, index) => {
    const windowStart = Math.max(0, index - windowSize + 1);
    const windowItems = daily.slice(windowStart, index + 1);
    const total = windowItems.reduce((sum, item) => sum + item.minutes, 0);

    return {
      day: day.date,
      label: day.label,
      value: Math.round(total / windowItems.length),
    };
  });
}

export function computeMetricSparklineStats(points: MetricSparklinePoint[]) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const avg = total / points.length;

  const mid = Math.floor(points.length / 2);
  const firstHalf = points.slice(0, mid);
  const secondHalf = points.slice(mid);
  const firstAvg =
    firstHalf.reduce((sum, point) => sum + point.value, 0) / (firstHalf.length || 1);
  const secondAvg =
    secondHalf.reduce((sum, point) => sum + point.value, 0) / (secondHalf.length || 1);
  const trendPct = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;
  const max = Math.max(...points.map((point) => point.value), 1);
  const min = Math.min(...points.map((point) => point.value));

  return { total, avg, max, min, trendPct };
}

function formatShortDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function buildLinePath(
  points: MetricSparklinePoint[],
  width: number,
  height: number,
  padding: number,
): string {
  if (points.length === 0) return '';

  const max = Math.max(...points.map((point) => point.value), 1);
  const min = Math.min(...points.map((point) => point.value));
  const range = max - min || 1;
  const drawHeight = height - padding * 2;
  const drawWidth = width - padding * 2;

  return points
    .map((point, index) => {
      const x = points.length === 1
        ? width / 2
        : padding + (index / (points.length - 1)) * drawWidth;
      const y =
        padding + drawHeight - ((point.value - min) / range) * drawHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export function buildAreaPath(
  points: MetricSparklinePoint[],
  width: number,
  height: number,
  padding: number,
): string {
  if (points.length === 0) return '';

  const linePath = buildLinePath(points, width, height, padding);
  const drawWidth = width - padding * 2;
  const lastX = points.length === 1 ? width / 2 : padding + drawWidth;
  const firstX = points.length === 1 ? width / 2 : padding;
  const bottom = height - padding;

  return `${linePath} L ${lastX.toFixed(2)} ${bottom.toFixed(2)} L ${firstX.toFixed(2)} ${bottom.toFixed(2)} Z`;
}

function getEndpoint(
  points: MetricSparklinePoint[],
  width: number,
  height: number,
  padding: number,
): { x: number; y: number } | null {
  if (points.length === 0) return null;

  const max = Math.max(...points.map((point) => point.value), 1);
  const min = Math.min(...points.map((point) => point.value));
  const range = max - min || 1;
  const drawHeight = height - padding * 2;
  const drawWidth = width - padding * 2;
  const last = points[points.length - 1];

  return {
    x: points.length === 1 ? width / 2 : padding + drawWidth,
    y:
      padding +
      drawHeight -
      (((last?.value ?? 0) - min) / range) * drawHeight,
  };
}

function getBaselineY(
  avg: number,
  points: MetricSparklinePoint[],
  height: number,
  padding: number,
): number {
  const max = Math.max(...points.map((point) => point.value), 1);
  const min = Math.min(...points.map((point) => point.value));
  const range = max - min || 1;
  const drawHeight = height - padding * 2;
  return padding + drawHeight - ((avg - min) / range) * drawHeight;
}

function BaselineLine({
  y,
  width,
  padding,
  color,
}: {
  y: number;
  width: number;
  padding: number;
  color: string;
}) {
  return (
    <line
      x1={padding}
      y1={y}
      x2={width - padding}
      y2={y}
      stroke={color}
      strokeWidth={0.75}
      strokeDasharray="3 3"
      opacity={0.25}
    />
  );
}

function LineSparkline({
  points,
  width,
  height,
  color,
  strokeWidth,
  showEndpoint,
  showBaseline,
  avg,
}: {
  points: MetricSparklinePoint[];
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  showEndpoint: boolean;
  showBaseline: boolean;
  avg: number;
}) {
  const padding = 2 + strokeWidth;
  const path = buildLinePath(points, width, height, padding);
  const endpoint = showEndpoint
    ? getEndpoint(points, width, height, padding)
    : null;
  const baselineY = showBaseline
    ? getBaselineY(avg, points, height, padding)
    : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
      className="block"
    >
      {baselineY != null && (
        <BaselineLine
          y={baselineY}
          width={width}
          padding={padding}
          color={color}
        />
      )}
      <path
        d={path}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {endpoint && (
        <circle
          cx={endpoint.x}
          cy={endpoint.y}
          r={strokeWidth + 0.5}
          fill={color}
        />
      )}
    </svg>
  );
}

function AreaSparkline({
  points,
  width,
  height,
  color,
  strokeWidth,
  showEndpoint,
  showBaseline,
  avg,
}: {
  points: MetricSparklinePoint[];
  width: number;
  height: number;
  color: string;
  strokeWidth: number;
  showEndpoint: boolean;
  showBaseline: boolean;
  avg: number;
}) {
  const padding = 2 + strokeWidth;
  const linePath = buildLinePath(points, width, height, padding);
  const areaPath = buildAreaPath(points, width, height, padding);
  const endpoint = showEndpoint
    ? getEndpoint(points, width, height, padding)
    : null;
  const baselineY = showBaseline
    ? getBaselineY(avg, points, height, padding)
    : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
      className="block"
    >
      {baselineY != null && (
        <BaselineLine
          y={baselineY}
          width={width}
          padding={padding}
          color={color}
        />
      )}
      <path d={areaPath} fill={color} opacity={0.12} />
      <path
        d={linePath}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {endpoint && (
        <circle
          cx={endpoint.x}
          cy={endpoint.y}
          r={strokeWidth + 0.5}
          fill={color}
        />
      )}
    </svg>
  );
}

function BarSparkline({
  points,
  width,
  height,
  color,
  showBaseline,
  avg,
}: {
  points: MetricSparklinePoint[];
  width: number;
  height: number;
  color: string;
  showBaseline: boolean;
  avg: number;
}) {
  if (points.length === 0) return null;

  const padding = 2;
  const max = Math.max(...points.map((point) => point.value), 1);
  const min = Math.min(...points.map((point) => point.value));
  const range = max - min || 1;
  const drawHeight = height - padding * 2;
  const drawWidth = width - padding * 2;
  const gap = 1;
  const barWidth = Math.max(
    1,
    (drawWidth - gap * (points.length - 1)) / points.length,
  );
  const baselineY = showBaseline
    ? getBaselineY(avg, points, height, padding)
    : null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      fill="none"
      aria-hidden="true"
      className="block"
    >
      {baselineY != null && (
        <BaselineLine
          y={baselineY}
          width={width}
          padding={padding}
          color={color}
        />
      )}
      {points.map((point, index) => {
        const barHeight = Math.max(
          1,
          ((point.value - min) / range) * drawHeight,
        );
        const x = padding + index * (barWidth + gap);
        const y = padding + drawHeight - barHeight;
        const opacityStep = points.length === 1 ? 1 : index / (points.length - 1);

        return (
          <rect
            key={`${point.day}-${index}`}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            rx={Math.min(barWidth / 2, 1)}
            fill={color}
            opacity={0.7 + 0.3 * opacityStep}
          />
        );
      })}
    </svg>
  );
}

function TrendIndicator({ trendPct }: { trendPct: number }) {
  const isUp = trendPct > 0;
  const isFlat = Math.abs(trendPct) < 0.5;
  const formatted = `${isUp ? '+' : ''}${trendPct.toFixed(1)}%`;

  if (isFlat) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs tabular-nums text-[var(--ink-tertiary)]">
        {formatted}
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium tabular-nums',
        isUp ? 'text-[var(--ink-positive)]' : 'text-[var(--ink-negative)]',
      )}
    >
      <svg
        viewBox="0 0 10 10"
        fill="currentColor"
        aria-hidden="true"
        className={cn('size-2.5', !isUp && 'rotate-180')}
      >
        <path d="M5 1L9 6H1L5 1Z" />
      </svg>
      {formatted}
    </span>
  );
}

export function MetricSparkline({
  data,
  variant = 'line',
  color = 'currentColor',
  width = 120,
  height = 32,
  strokeWidth = 1.5,
  showEndpoint = true,
  showLabel = false,
  showTrend = false,
  showDateRange = false,
  showBaseline = false,
  valueFormatter = (value) => String(value),
  className,
  ...rest
}: MetricSparklineProps) {
  const points = data.filter((point) => Number.isFinite(point.value));

  if (points.length === 0) {
    return null;
  }

  const stats = computeMetricSparklineStats(points);
  const dateStart = points[0]?.day ?? '';
  const dateEnd = points[points.length - 1]?.day ?? '';
  const chartProps = { showBaseline, avg: stats.avg };

  return (
    <div
      data-slot="metric-sparkline"
      className={cn('inline-flex flex-col gap-1', className)}
      aria-label={`Metric trend: ${valueFormatter(stats.total)} total`}
      {...rest}
    >
      <div className="inline-flex items-center gap-2">
        {variant === 'bar' ? (
          <BarSparkline
            points={points}
            width={width}
            height={height}
            color={color}
            {...chartProps}
          />
        ) : variant === 'area' ? (
          <AreaSparkline
            points={points}
            width={width}
            height={height}
            color={color}
            strokeWidth={strokeWidth}
            showEndpoint={showEndpoint}
            {...chartProps}
          />
        ) : (
          <LineSparkline
            points={points}
            width={width}
            height={height}
            color={color}
            strokeWidth={strokeWidth}
            showEndpoint={showEndpoint}
            {...chartProps}
          />
        )}
        <div className="inline-flex flex-col gap-0.5">
          {showLabel && (
            <span className="text-xs tabular-nums text-[var(--ink-tertiary)]">
              {valueFormatter(stats.total)}
            </span>
          )}
          {showTrend && <TrendIndicator trendPct={stats.trendPct} />}
        </div>
      </div>
      {showDateRange && (
        <span className="text-[10px] tabular-nums text-[var(--ink-tertiary)] opacity-60">
          {formatShortDate(dateStart)} - {formatShortDate(dateEnd)}
        </span>
      )}
    </div>
  );
}

export function AnalyticsKpiCard({ label, value, hint, tone = 'neutral', sparkline }: KpiProps) {
  const effectiveSparkline = sparkline?.data.some((point) => Number.isFinite(point.value))
    ? sparkline
    : undefined;
  const toneClass =
    tone === 'positive'
      ? 'text-[var(--ink-positive)]'
      : tone === 'negative'
        ? 'text-[var(--ink-negative)]'
        : 'text-[var(--ink-strong)]';

  return (
    <article
      className={cn(
        'rounded-xl bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]',
        effectiveSparkline ? 'flex min-h-[112px] flex-col' : null,
      )}
    >
      <p className="text-xs font-medium text-[var(--ink-secondary)]">{label}</p>
      <p className={cn('font-numeric mt-1 text-2xl font-semibold', toneClass)}>{value}</p>
      {hint ? <p className="text-xs text-[var(--ink-tertiary)]">{hint}</p> : null}
      {effectiveSparkline ? (
        <div className="mt-auto pt-3 text-[var(--ink-accent)]">
          <MetricSparkline {...effectiveSparkline} />
        </div>
      ) : null}
    </article>
  );
}

type BreakdownListProps = {
  title: string;
  items: BreakdownItem[];
  emptyMessage?: string;
  showLanguageIcons?: boolean;
  action?: ReactNode;
};

export function AnalyticsBreakdownList({
  title,
  items,
  emptyMessage,
  showLanguageIcons = false,
  action,
}: BreakdownListProps) {
  return (
    <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--ink-strong)]">{title}</h3>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
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
        : range === 'all-time'
          ? 'All-time trend'
          : 'Custom trend';
  const trendData = range === 'week' ? weekly : dailyData;
  const maxVisibleTicks = range === 'month' || range === 'all-time' ? 9 : range === 'custom' ? 8 : range === 'today' ? 8 : trendData.length;
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
  action,
}: {
  title: string;
  items: BreakdownItem[];
    action?: ReactNode;
}) {
  const colors = items.map((_, idx) => overviewChartPalette[idx % overviewChartPalette.length]);

  return (
    <article className="flex min-h-[420px] flex-col rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--ink-strong)]">{title}</h3>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-3 flex h-[360px] min-h-[360px] flex-col">
        {items.length === 0 ? (
          <p className="text-sm text-[var(--ink-tertiary)]">No data for this filter.</p>
        ) : (
            <>
              <div className="h-[250px] min-h-[250px]">
                <KairosDonutChart
                  data={items}
                  index="name"
                  category="share"
                  colors={colors}
                  valueFormatter={(value) => `${value}%`}
                  showLegend={false}
                  height={250}
                />
              </div>
              <div className="mt-3 grid h-24 min-h-24 grid-cols-1 gap-1 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-1">
                {items.map((item, index) => (
                  <div key={item.name} className="flex min-w-0 items-center gap-2 text-xs text-[var(--ink-secondary)]">
                    <span
                      aria-hidden="true"
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: colors[index] }}
                    />
                    <span className="truncate">{item.name}</span>
                    <span className="font-numeric ml-auto shrink-0 text-[var(--ink-tertiary)]">{item.share}%</span>
                  </div>
                ))}
              </div>
            </>
        )}
      </div>
    </article>
  );
}
