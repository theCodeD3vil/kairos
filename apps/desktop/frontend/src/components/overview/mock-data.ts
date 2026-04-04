import type { OverviewRange, OverviewSnapshot } from '@/components/overview/types';

const rangeSeeds: Record<OverviewRange, Omit<OverviewSnapshot, 'range'>> = {
  today: {
    todayMinutes: 408,
    weekMinutes: 1694,
    sessionCount: 7,
    averageSessionMinutes: 58,
    codingDaysThisWeek: 5,
    lastActiveAt: 'Today 14:26',
    trackingEnabled: true,
    localOnlyMode: true,
    lastUpdatedAt: 'Today 14:28',
    weeklyTrend: [
      { label: 'Mon', value: 5.4 },
      { label: 'Tue', value: 6.1 },
      { label: 'Wed', value: 5.9 },
      { label: 'Thu', value: 6.3 },
      { label: 'Fri', value: 6.8 },
    ],
    topProjects: [
      { project: 'desktop-frontend', minutes: 175, recentActivityAt: '10m ago' },
      { project: 'kairos-backend-core', minutes: 126, recentActivityAt: '1h ago' },
      { project: 'internal-auth-service', minutes: 72, recentActivityAt: '3h ago' },
      { project: 'kairos-vscode', minutes: 35, recentActivityAt: '6h ago' },
    ],
    topLanguages: [
      { language: 'TypeScript', minutes: 220, share: 54 },
      { language: 'Go', minutes: 103, share: 25 },
      { language: 'SQL', minutes: 52, share: 13 },
      { language: 'Markdown', minutes: 33, share: 8 },
    ],
    recentSessions: [
      { project: 'desktop-frontend', durationMinutes: 72, startAt: '09:12' },
      { project: 'kairos-backend-core', durationMinutes: 54, startAt: '11:04' },
      { project: 'desktop-frontend', durationMinutes: 61, startAt: '13:37' },
    ],
    activeHoursSummary: '09:00 - 12:00',
  },
  week: {
    todayMinutes: 408,
    weekMinutes: 2021,
    sessionCount: 34,
    averageSessionMinutes: 59,
    codingDaysThisWeek: 7,
    lastActiveAt: 'Today 14:26',
    trackingEnabled: true,
    localOnlyMode: true,
    lastUpdatedAt: 'Today 14:28',
    weeklyTrend: [
      { label: 'Mon', value: 5.2 },
      { label: 'Tue', value: 6.0 },
      { label: 'Wed', value: 4.8 },
      { label: 'Thu', value: 7.1 },
      { label: 'Fri', value: 6.8 },
      { label: 'Sat', value: 2.4 },
      { label: 'Sun', value: 1.4 },
    ],
    topProjects: [
      { project: 'desktop-frontend', minutes: 724, recentActivityAt: '10m ago' },
      { project: 'kairos-backend-core', minutes: 525, recentActivityAt: '1h ago' },
      { project: 'internal-auth-service', minutes: 391, recentActivityAt: '3h ago' },
      { project: 'kairos-vscode', minutes: 238, recentActivityAt: '6h ago' },
      { project: 'docs-site', minutes: 143, recentActivityAt: '1d ago' },
    ],
    topLanguages: [
      { language: 'TypeScript', minutes: 909, share: 45 },
      { language: 'Go', minutes: 557, share: 28 },
      { language: 'SQL', minutes: 280, share: 14 },
      { language: 'Markdown', minutes: 142, share: 7 },
      { language: 'YAML', minutes: 133, share: 6 },
    ],
    recentSessions: [
      { project: 'desktop-frontend', durationMinutes: 82, startAt: 'Today 09:12' },
      { project: 'kairos-backend-core', durationMinutes: 53, startAt: 'Today 11:10' },
      { project: 'internal-auth-service', durationMinutes: 65, startAt: 'Yesterday 16:42' },
    ],
    activeHoursSummary: '09:00 - 12:00',
  },
  month: {
    todayMinutes: 408,
    weekMinutes: 2021,
    sessionCount: 128,
    averageSessionMinutes: 53,
    codingDaysThisWeek: 7,
    lastActiveAt: 'Today 14:26',
    trackingEnabled: true,
    localOnlyMode: true,
    lastUpdatedAt: 'Today 14:28',
    weeklyTrend: [
      { label: 'W1', value: 37.8 },
      { label: 'W2', value: 35.4 },
      { label: 'W3', value: 34.9 },
      { label: 'W4', value: 33.6 },
    ],
    topProjects: [
      { project: 'desktop-frontend', minutes: 2972, recentActivityAt: '10m ago' },
      { project: 'kairos-backend-core', minutes: 2043, recentActivityAt: '1h ago' },
      { project: 'internal-auth-service', minutes: 1529, recentActivityAt: '3h ago' },
      { project: 'kairos-vscode', minutes: 921, recentActivityAt: '6h ago' },
      { project: 'ops-automation', minutes: 645, recentActivityAt: '2d ago' },
    ],
    topLanguages: [
      { language: 'TypeScript', minutes: 3492, share: 43 },
      { language: 'Go', minutes: 2373, share: 29 },
      { language: 'SQL', minutes: 1035, share: 13 },
      { language: 'Markdown', minutes: 651, share: 8 },
      { language: 'YAML', minutes: 566, share: 7 },
    ],
    recentSessions: [
      { project: 'desktop-frontend', durationMinutes: 82, startAt: 'Today 09:12' },
      { project: 'kairos-backend-core', durationMinutes: 53, startAt: 'Today 11:10' },
      { project: 'internal-auth-service', durationMinutes: 65, startAt: 'Yesterday 16:42' },
    ],
    activeHoursSummary: '10:00 - 14:00',
  },
};

export function getOverviewSnapshot(range: OverviewRange): OverviewSnapshot {
  return {
    range,
    ...rangeSeeds[range],
  };
}

export const overviewRanges: Array<{ label: string; value: OverviewRange }> = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
];
