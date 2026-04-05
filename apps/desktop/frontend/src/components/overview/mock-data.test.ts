import { describe, expect, it } from 'vitest';
import { getOverviewSnapshot } from '@/components/overview/mock-data';

describe('getOverviewSnapshot', () => {
  it('returns the requested range and required simplified fields', () => {
    const snapshot = getOverviewSnapshot('week');

    expect(snapshot.range).toBe('week');
    expect(snapshot.todayMinutes).toBeTypeOf('number');
    expect(snapshot.weekMinutes).toBeTypeOf('number');
    expect(snapshot.sessionCount).toBeTypeOf('number');
    expect(snapshot.averageSessionMinutes).toBeTypeOf('number');
    expect(snapshot.codingDaysThisWeek).toBeTypeOf('number');
    expect(snapshot.lastActiveAt).toBeTypeOf('string');
    expect(snapshot.trackingEnabled).toBeTypeOf('boolean');
    expect(snapshot.localOnlyMode).toBeTypeOf('boolean');
    expect(snapshot.lastUpdatedAt).toBeTypeOf('string');
    expect(snapshot.activeHoursSummary).toBeTypeOf('string');
    expect(snapshot.currentMachine.machineName).toBeTypeOf('string');
    expect(snapshot.appStatus.appVersion).toBeTypeOf('string');
    expect(snapshot.knownMachines.length).toBeGreaterThan(0);
    expect(snapshot.lastActiveMachine).toBeTypeOf('string');
  });

  it('changes summary values and trend shape when switching ranges', () => {
    const today = getOverviewSnapshot('today');
    const week = getOverviewSnapshot('week');
    const month = getOverviewSnapshot('month');

    expect(today.sessionCount).not.toBe(week.sessionCount);
    expect(week.sessionCount).not.toBe(month.sessionCount);
    expect(today.weeklyTrend.length).toBeLessThanOrEqual(week.weeklyTrend.length);
    expect(month.weeklyTrend.length).toBeLessThanOrEqual(week.weeklyTrend.length);
  });

  it('provides list data for projects, languages, and recent sessions', () => {
    const snapshot = getOverviewSnapshot('week');

    expect(snapshot.topProjects.length).toBeGreaterThan(0);
    expect(snapshot.topLanguages.length).toBeGreaterThan(0);
    expect(snapshot.machineDistribution.length).toBeGreaterThan(0);
    expect(snapshot.recentSessions.length).toBeGreaterThan(0);
    expect(snapshot.topProjects[0].project).toBeTruthy();
    expect(snapshot.topLanguages[0].language).toBeTruthy();
    expect(snapshot.recentSessions[0].project).toBeTruthy();
    expect(snapshot.recentSessions[0].machineName).toBeTruthy();
    expect(snapshot.recentSessions[0].osLabel).toBeTruthy();
    expect(snapshot.machineDistribution[0].machineName).toBeTruthy();
  });
});
