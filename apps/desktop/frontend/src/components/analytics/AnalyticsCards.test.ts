import { describe, expect, it } from 'vitest';
import type { DailyStat } from '@/data/mockAnalytics';
import {
  buildAreaPath,
  buildLinePath,
  computeMetricSparklineStats,
  mapCumulativeAverageSparklineData,
  mapDailyMinutesSparklineData,
  mapRollingAverageSparklineData,
  resolveTrendPresentation,
} from '@/components/analytics/AnalyticsCards';

const sampleDaily: DailyStat[] = [
  { date: '2026-04-01', label: 'Apr 1', minutes: 30 },
  { date: '2026-04-02', label: 'Apr 2', minutes: 60 },
  { date: '2026-04-03', label: 'Apr 3', minutes: 90 },
];

const sampleWeekly = [
  { label: 'Apr 1', minutes: 180 },
  { label: 'Apr 8', minutes: 240 },
];

describe('resolveTrendPresentation', () => {
  it('uses weekly trend title and weekly buckets for week range', () => {
    const result = resolveTrendPresentation('week', sampleDaily, sampleWeekly);

    expect(result.trendTitle).toBe('Weekly trend');
    expect(result.trendData).toEqual(sampleWeekly);
    expect(result.tickStep).toBe(1);
  });

  it('uses monthly trend title and daily buckets for month range', () => {
    const result = resolveTrendPresentation('month', sampleDaily, sampleWeekly);

    expect(result.trendTitle).toBe('Monthly trend');
    expect(result.trendData).toEqual(sampleDaily.map((day) => ({ label: day.label, minutes: day.minutes })));
  });

  it('uses custom trend title and applies tick thinning for long custom daily series', () => {
    const longDaily: DailyStat[] = Array.from({ length: 20 }, (_, index) => ({
      date: `2026-04-${String(index + 1).padStart(2, '0')}`,
      label: `Apr ${index + 1}`,
      minutes: (index + 1) * 10,
    }));

    const result = resolveTrendPresentation('custom', longDaily, sampleWeekly);

    expect(result.trendTitle).toBe('Custom trend');
    expect(result.trendData).toHaveLength(20);
    expect(result.tickStep).toBe(3);
  });

  it('uses today trend title and daily buckets for today range', () => {
    const result = resolveTrendPresentation('today', sampleDaily, sampleWeekly);

    expect(result.trendTitle).toBe('Today trend');
    expect(result.trendData).toEqual(sampleDaily.map((day) => ({ label: day.label, minutes: day.minutes })));
  });
});

describe('MetricSparkline helpers', () => {
  it('maps metric values into source-compatible SVG paths', () => {
    const points = [
      { day: '2026-04-01', label: 'First', value: 0 },
      { day: '2026-04-02', label: 'Second', value: 10 },
      { day: '2026-04-03', label: 'Third', value: 5 },
    ];

    expect(buildLinePath(points, 100, 40, 2)).toBe('M 2.00 38.00 L 50.00 2.00 L 98.00 20.00');
    expect(buildAreaPath(points, 100, 40, 2)).toBe('M 2.00 38.00 L 50.00 2.00 L 98.00 20.00 L 98.00 38.00 L 2.00 38.00 Z');
  });

  it('computes trend stats using first half and second half averages', () => {
    const stats = computeMetricSparklineStats([
      { day: '2026-04-01', value: 10 },
      { day: '2026-04-02', value: 20 },
      { day: '2026-04-03', value: 40 },
      { day: '2026-04-04', value: 60 },
    ]);

    expect(stats.total).toBe(130);
    expect(stats.avg).toBe(32.5);
    expect(stats.trendPct).toBeCloseTo(233.333, 3);
  });

  it('builds metric-specific time series for KPI sparklines', () => {
    expect(mapDailyMinutesSparklineData(sampleDaily)).toEqual([
      { day: '2026-04-01', label: 'Apr 1', value: 30 },
      { day: '2026-04-02', label: 'Apr 2', value: 60 },
      { day: '2026-04-03', label: 'Apr 3', value: 90 },
    ]);
    expect(mapCumulativeAverageSparklineData(sampleDaily).map((point) => point.value)).toEqual([30, 45, 60]);
    expect(mapRollingAverageSparklineData(sampleDaily, 2).map((point) => point.value)).toEqual([30, 45, 75]);
  });
});
