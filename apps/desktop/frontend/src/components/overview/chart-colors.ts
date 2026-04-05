export const overviewChartPalette = ['#22c55e', '#3b82f6', '#6366f1', '#ef4444', '#f59e0b'] as const;

export const overviewChartSemanticColors = {
  success: overviewChartPalette[0],
  info: overviewChartPalette[1],
  accent: overviewChartPalette[2],
  danger: overviewChartPalette[3],
  warning: overviewChartPalette[4],
} as const;

export const syncUptimeColors = {
  high: '#22c55e',
  medium: '#84cc16',
  low: '#f59e0b',
  critical: '#ef4444',
} as const;
