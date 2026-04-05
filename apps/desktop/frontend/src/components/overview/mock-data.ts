import { syncUptimeColors } from '@/components/overview/chart-colors';
import type { OverviewRange, OverviewSnapshot } from '@/components/overview/types';
import { systemInfoSnapshot } from '@/mocks/system-info';

const syncColorByLevel = {
  4: syncUptimeColors.high,
  3: syncUptimeColors.medium,
  2: syncUptimeColors.low,
  1: syncUptimeColors.critical,
} as const;

function buildSyncBlocks(
  keyPrefix: string,
  levels: Array<1 | 2 | 3 | 4>,
  issueLabel?: string,
  totalBars = 40,
) {
  return Array.from({ length: totalBars }, (_, index) => {
    const level = levels[index % levels.length];
    const color = syncColorByLevel[level];
    const slot = index + 1;
    const tooltip =
      level === 4
        ? `Sync slot ${slot}: healthy`
        : level === 3
          ? `Sync slot ${slot}: minor delay`
          : level === 2
            ? `Sync slot ${slot}: degraded`
            : `Sync slot ${slot}: ${issueLabel ?? 'retry required'}`;
    return {
      key: `${keyPrefix}-${slot}`,
      color,
      tooltip,
    };
  });
}

type PresetOverviewRange = Exclude<OverviewRange, 'custom'>;

const rangeSeeds: Record<PresetOverviewRange, Omit<OverviewSnapshot, 'range'>> = {
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
    currentMachine: systemInfoSnapshot.currentMachine,
    knownMachines: systemInfoSnapshot.knownMachines,
    appStatus: systemInfoSnapshot.appStatus,
    lastActiveMachine: 'Kairos-MacBook-Pro',
    weeklyTrend: [
      { label: 'Mon', value: 5.4 },
      { label: 'Tue', value: 6.1 },
      { label: 'Wed', value: 5.9 },
      { label: 'Thu', value: 6.3 },
      { label: 'Fri', value: 6.8 },
    ],
    topProjects: [
      { project: 'desktop-frontend', minutes: 175, recentActivityAt: '10m ago', color: 'var(--chart-green)' },
      { project: 'kairos-backend-core', minutes: 126, recentActivityAt: '1h ago', color: 'var(--chart-blue)' },
      { project: 'internal-auth-service', minutes: 72, recentActivityAt: '3h ago', color: 'var(--chart-indigo)' },
      { project: 'kairos-vscode', minutes: 35, recentActivityAt: '6h ago', color: 'var(--chart-red)' },
    ],
    topLanguages: [
      { language: 'TypeScript', minutes: 220, share: 54 },
      { language: 'Go', minutes: 103, share: 25 },
      { language: 'SQL', minutes: 52, share: 13 },
      { language: 'Markdown', minutes: 33, share: 8 },
    ],
    machineDistribution: [
      { machineName: 'Kairos-MacBook-Pro', minutes: 348, share: 85 },
      { machineName: 'Kairos-ThinkPad', minutes: 60, share: 15 },
    ],
    recentSessions: [
      {
        project: 'desktop-frontend',
        durationMinutes: 72,
        startAt: '09:12',
        machineName: 'Kairos-MacBook-Pro',
        osLabel: 'macOS',
      },
      {
        project: 'kairos-backend-core',
        durationMinutes: 54,
        startAt: '11:04',
        machineName: 'Kairos-MacBook-Pro',
        osLabel: 'macOS',
      },
      {
        project: 'desktop-frontend',
        durationMinutes: 61,
        startAt: '13:37',
        machineName: 'Kairos-MacBook-Pro',
        osLabel: 'macOS',
      },
    ],
    activeHoursSummary: '09:00 - 12:00',
    syncHealth: {
      status: 'Healthy',
      lastSyncAt: 'Today 14:27',
      blocks: buildSyncBlocks('today', [4, 4, 3, 4, 2]),
    },
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
    currentMachine: systemInfoSnapshot.currentMachine,
    knownMachines: systemInfoSnapshot.knownMachines,
    appStatus: systemInfoSnapshot.appStatus,
    lastActiveMachine: 'Kairos-MacBook-Pro',
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
      { project: 'desktop-frontend', minutes: 724, recentActivityAt: '10m ago', color: 'var(--chart-green)' },
      { project: 'kairos-backend-core', minutes: 525, recentActivityAt: '1h ago', color: 'var(--chart-blue)' },
      { project: 'internal-auth-service', minutes: 391, recentActivityAt: '3h ago', color: 'var(--chart-indigo)' },
      { project: 'kairos-vscode', minutes: 238, recentActivityAt: '6h ago', color: 'var(--chart-red)' },
      { project: 'docs-site', minutes: 143, recentActivityAt: '1d ago', color: 'var(--chart-amber)' },
    ],
    topLanguages: [
      { language: 'TypeScript', minutes: 909, share: 45 },
      { language: 'Go', minutes: 557, share: 28 },
      { language: 'SQL', minutes: 280, share: 14 },
      { language: 'Markdown', minutes: 142, share: 7 },
      { language: 'YAML', minutes: 133, share: 6 },
    ],
    machineDistribution: [
      { machineName: 'Kairos-MacBook-Pro', minutes: 1616, share: 80 },
      { machineName: 'Kairos-ThinkPad', minutes: 405, share: 20 },
    ],
    recentSessions: [
      {
        project: 'desktop-frontend',
        durationMinutes: 82,
        startAt: 'Today 09:12',
        machineName: 'Kairos-MacBook-Pro',
        osLabel: 'macOS',
      },
      {
        project: 'kairos-backend-core',
        durationMinutes: 53,
        startAt: 'Today 11:10',
        machineName: 'Kairos-MacBook-Pro',
        osLabel: 'macOS',
      },
      {
        project: 'internal-auth-service',
        durationMinutes: 65,
        startAt: 'Yesterday 16:42',
        machineName: 'Kairos-ThinkPad',
        osLabel: 'Ubuntu',
      },
    ],
    activeHoursSummary: '09:00 - 12:00',
    syncHealth: {
      status: 'Healthy',
      lastSyncAt: 'Today 14:27',
      blocks: buildSyncBlocks('week', [4, 3, 4, 2, 3, 4]),
    },
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
    currentMachine: systemInfoSnapshot.currentMachine,
    knownMachines: systemInfoSnapshot.knownMachines,
    appStatus: systemInfoSnapshot.appStatus,
    lastActiveMachine: 'Kairos-MacBook-Pro',
    weeklyTrend: [
      { label: 'W1', value: 37.8 },
      { label: 'W2', value: 35.4 },
      { label: 'W3', value: 34.9 },
      { label: 'W4', value: 33.6 },
    ],
    topProjects: [
      { project: 'desktop-frontend', minutes: 2972, recentActivityAt: '10m ago', color: 'var(--chart-green)' },
      { project: 'kairos-backend-core', minutes: 2043, recentActivityAt: '1h ago', color: 'var(--chart-blue)' },
      { project: 'internal-auth-service', minutes: 1529, recentActivityAt: '3h ago', color: 'var(--chart-indigo)' },
      { project: 'kairos-vscode', minutes: 921, recentActivityAt: '6h ago', color: 'var(--chart-red)' },
      { project: 'ops-automation', minutes: 645, recentActivityAt: '2d ago', color: 'var(--chart-amber)' },
    ],
    topLanguages: [
      { language: 'TypeScript', minutes: 3492, share: 43 },
      { language: 'Go', minutes: 2373, share: 29 },
      { language: 'SQL', minutes: 1035, share: 13 },
      { language: 'Markdown', minutes: 651, share: 8 },
      { language: 'YAML', minutes: 566, share: 7 },
    ],
    machineDistribution: [
      { machineName: 'Kairos-MacBook-Pro', minutes: 5920, share: 73 },
      { machineName: 'Kairos-ThinkPad', minutes: 2230, share: 27 },
    ],
    recentSessions: [
      {
        project: 'desktop-frontend',
        durationMinutes: 82,
        startAt: 'Today 09:12',
        machineName: 'Kairos-MacBook-Pro',
        osLabel: 'macOS',
      },
      {
        project: 'kairos-backend-core',
        durationMinutes: 53,
        startAt: 'Today 11:10',
        machineName: 'Kairos-MacBook-Pro',
        osLabel: 'macOS',
      },
      {
        project: 'internal-auth-service',
        durationMinutes: 65,
        startAt: 'Yesterday 16:42',
        machineName: 'Kairos-ThinkPad',
        osLabel: 'Ubuntu',
      },
    ],
    activeHoursSummary: '10:00 - 14:00',
    syncHealth: {
      status: 'Degraded',
      lastSyncAt: 'Today 14:27',
      blocks: buildSyncBlocks('month', [3, 3, 2, 3, 2, 1], 'extension restart needed'),
    },
  },
};

export function getOverviewSnapshot(range: OverviewRange): OverviewSnapshot {
  const resolvedRange: PresetOverviewRange = range === 'custom' ? 'week' : range;
  return {
    range,
    ...rangeSeeds[resolvedRange],
  };
}

export const overviewRanges: Array<{ label: string; value: OverviewRange }> = [
  { label: '1D', value: 'today' },
  { label: '7D', value: 'week' },
  { label: '1M', value: 'month' },
  { label: 'Custom', value: 'custom' },
];
