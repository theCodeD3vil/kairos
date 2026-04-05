export const overviewChartPalette = ['#22C55E', '#3B82F6', '#6366F1', '#EF4444', '#F59E0B'] as const;

export const overviewChartSemanticColors = {
  success: overviewChartPalette[0],
  info: overviewChartPalette[1],
  accent: overviewChartPalette[2],
  danger: overviewChartPalette[3],
  warning: overviewChartPalette[4],
} as const;

export const syncUptimeColors = {
  high: '#22C55E',
  medium: '#84CC16',
  low: '#F59E0B',
  critical: '#EF4444',
} as const;
