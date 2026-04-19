import { describe, expect, it } from 'vitest';
import type { DailyStat } from '@/data/mockAnalytics';
import { resolveTrendPresentation } from '@/components/analytics/AnalyticsCards';

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
