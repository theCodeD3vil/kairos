/**
 * Shared chart components built directly on recharts v2.
 * Replaces @lobehub/charts with zero external wrapper dependencies.
 */
import {
  Area,
  AreaChart as RechartsAreaChart,
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

/* ------------------------------------------------------------------ */
/*  Shared tooltip style                                              */
/* ------------------------------------------------------------------ */

const tooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--surface-deep)',
  border: 'none',
  borderRadius: 10,
  color: '#fff',
  fontSize: 12,
  padding: '8px 12px',
  boxShadow: '0 4px 20px rgba(0,0,0,.25)',
};

const tooltipLabelStyle: React.CSSProperties = {
  color: '#fff',
  fontWeight: 600,
  marginBottom: 4,
};

const tooltipItemStyle: React.CSSProperties = {
  color: '#ccc',
  fontSize: 12,
};

/* ------------------------------------------------------------------ */
/*  KairosAreaChart                                                   */
/* ------------------------------------------------------------------ */

type KairosAreaChartProps = {
  data: Record<string, unknown>[];
  index: string;
  categories: string[];
  colors: readonly string[];
  height?: number;
  showLegend?: boolean;
  showGridLines?: boolean;
  showGradient?: boolean;
  stack?: boolean;
  valueFormatter?: (value: number) => string;
  tooltipValueFormatter?: (value: number) => string;
  seriesLabels?: Partial<Record<string, string>>;
  yAxisWidth?: number;
};

function toDisplayLabel(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function resolveSeriesLabel(name: string | number, labels?: Partial<Record<string, string>>) {
  const key = String(name);
  return labels?.[key] ?? toDisplayLabel(key);
}

export function KairosAreaChart({
  data,
  index,
  categories,
  colors,
  height = 208,
  showLegend,
  showGridLines = true,
  showGradient = true,
  stack = false,
  valueFormatter = (v) => String(v),
  tooltipValueFormatter = valueFormatter,
  seriesLabels,
  yAxisWidth = 56,
}: KairosAreaChartProps) {
  const shouldShowLegend = showLegend ?? categories.length > 1;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsAreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          {categories.map((cat, i) => (
            <linearGradient key={cat} id={`gradient-${cat}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity={0.3} />
              <stop offset="95%" stopColor={colors[i % colors.length]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {showGridLines && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />}
        <XAxis
          dataKey={index}
          tick={{ fontSize: 12, fill: 'var(--ink-tertiary)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          width={yAxisWidth}
          tick={{ fontSize: 12, fill: 'var(--ink-tertiary)' }}
          tickFormatter={(v) => valueFormatter(v as number)}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(value: number, name: string | number) => [
            tooltipValueFormatter(Number(value)),
            resolveSeriesLabel(name, seriesLabels),
          ]}
          cursor={{ stroke: 'var(--ink-tertiary)', strokeWidth: 1, strokeDasharray: '4 4' }}
          isAnimationActive={false}
        />
        {shouldShowLegend && (
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: 'var(--ink-secondary)', paddingTop: 8 }}
          />
        )}
        {categories.map((cat, i) => (
          <Area
            key={cat}
            type="monotone"
            dataKey={cat}
            stackId={stack ? 'stack' : undefined}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            fill={showGradient ? `url(#gradient-${cat})` : colors[i % colors.length]}
            fillOpacity={showGradient ? 1 : 0.1}
            name={resolveSeriesLabel(cat, seriesLabels)}
            animationDuration={900}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0, fill: colors[i % colors.length] }}
          />
        ))}
      </RechartsAreaChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  KairosBarChart                                                    */
/* ------------------------------------------------------------------ */

type KairosBarChartProps = {
  data: Record<string, unknown>[];
  index: string;
  categories: string[];
  colors: readonly string[];
  height?: number;
  showLegend?: boolean;
  showGridLines?: boolean;
  valueFormatter?: (value: number) => string;
  tooltipValueFormatter?: (value: number) => string;
  seriesLabels?: Partial<Record<string, string>>;
  yAxisWidth?: number;
  rotateLabelX?: { angle: number; xAxisHeight?: number };
};

export function KairosBarChart({
  data,
  index,
  categories,
  colors,
  height = 224,
  showLegend,
  showGridLines = true,
  valueFormatter = (v) => String(v),
  tooltipValueFormatter = valueFormatter,
  seriesLabels,
  yAxisWidth = 56,
  rotateLabelX,
}: KairosBarChartProps) {
  const shouldShowLegend = showLegend ?? categories.length > 1;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} margin={{ top: 4, right: 4, bottom: rotateLabelX ? 20 : 0, left: 0 }}>
        {showGridLines && <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.4} />}
        <XAxis
          dataKey={index}
          tick={{ fontSize: 12, fill: 'var(--ink-tertiary)' }}
          axisLine={false}
          tickLine={false}
          angle={rotateLabelX?.angle}
          textAnchor={rotateLabelX ? 'end' : 'middle'}
          height={rotateLabelX?.xAxisHeight ?? 30}
        />
        <YAxis
          width={yAxisWidth}
          tick={{ fontSize: 12, fill: 'var(--ink-tertiary)' }}
          tickFormatter={(v) => valueFormatter(v as number)}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(value: number, name: string | number) => [
            tooltipValueFormatter(Number(value)),
            resolveSeriesLabel(name, seriesLabels),
          ]}
          cursor={{ fill: 'var(--surface-subtle)', opacity: 0.5 }}
          isAnimationActive={false}
        />
        {shouldShowLegend && (
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        )}
        {categories.map((cat, i) => (
          <Bar
            key={cat}
            dataKey={cat}
            fill={colors[i % colors.length]}
            name={resolveSeriesLabel(cat, seriesLabels)}
            radius={[6, 6, 0, 0]}
            animationDuration={900}
            maxBarSize={48}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  KairosDonutChart                                                  */
/* ------------------------------------------------------------------ */

type KairosDonutChartProps = {
  data: Record<string, unknown>[];
  index: string;
  category: string;
  colors: readonly string[];
  height?: number;
  valueFormatter?: (value: number) => string;
  showLegend?: boolean;
};

export function KairosDonutChart({
  data,
  index,
  category,
  colors,
  height = 200,
  valueFormatter = (v) => String(v),
  showLegend,
}: KairosDonutChartProps) {
  const shouldShowLegend = showLegend ?? data.length > 1;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          dataKey={category}
          nameKey={index}
          cx="50%"
          cy="50%"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={3}
          animationDuration={900}
          stroke="none"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(value: number, name: string | number) => [
            valueFormatter(Number(value)),
            toDisplayLabel(String(name)),
          ]}
          isAnimationActive={false}
        />
        {shouldShowLegend && (
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
            formatter={(value) => toDisplayLabel(String(value))}
          />
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}

/* ------------------------------------------------------------------ */
/*  KairosTracker                                                     */
/* ------------------------------------------------------------------ */

type TrackerBlock = {
  color: string;
  tooltip?: string;
};

type KairosTrackerProps = {
  data: TrackerBlock[];
  blockHeight?: number;
  blockWidth?: number;
  blockGap?: number;
};

export function KairosTracker({
  data,
  blockHeight = 28,
  blockWidth = 16,
  blockGap = 6,
}: KairosTrackerProps) {
  return (
    <div className="flex flex-wrap items-center" style={{ gap: blockGap }}>
      {data.map((block, i) => (
        <div
          key={i}
          title={block.tooltip}
          style={{
            width: blockWidth,
            height: blockHeight,
            backgroundColor: block.color,
            borderRadius: 4,
          }}
        />
      ))}
    </div>
  );
}
