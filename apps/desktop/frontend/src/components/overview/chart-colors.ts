export const overviewChartPalette = ['var(--chart-green)', 'var(--chart-blue)', 'var(--chart-indigo)', 'var(--chart-red)', 'var(--chart-amber)'] as const;

export const overviewChartSemanticColors = {
  success: overviewChartPalette[0],
  info: overviewChartPalette[1],
  accent: overviewChartPalette[2],
  danger: overviewChartPalette[3],
  warning: overviewChartPalette[4],
} as const;

export const syncUptimeColors = {
  high: 'var(--chart-green)',
  medium: 'var(--chart-lime)',
  low: 'var(--chart-amber)',
  critical: 'var(--chart-red)',
} as const;
