import type { AppStatus, MachineInfo } from '@/mocks/system-info';

export type OverviewRange = 'today' | 'week' | 'month' | 'custom';

export function normalizeOverviewRange(value: string | null | undefined): Exclude<OverviewRange, 'custom'> {
  switch (value) {
    case 'today':
      return 'today';
    case 'month':
    case 'last-30-days':
      return 'month';
    case 'week':
    case 'last-7-days':
    default:
      return 'week';
  }
}

export type WeeklyTrendPoint = {
  label: string;
  value: number;
};

export type TodayTrendInterval = '5m' | '30m' | '1h' | '2h' | '6h';

export type TopProject = {
  project: string;
  minutes: number;
  recentActivityAt: string;
  color: string;
};

export type TopLanguage = {
  language: string;
  minutes: number;
  share: number;
};

export type MachineTimeShare = {
  machineName: string;
  minutes: number;
  share: number;
  color: string;
};

export type RecentSession = {
  project: string;
  language?: string;
  durationMinutes: number;
  startAt: string;
  rangeStartAt?: string;
  rangeEndAt?: string;
  machineName: string;
  osLabel: string;
  sessionCount?: number;
  machineCount?: number;
  subSessions?: Array<{
    id: string;
    language: string;
    durationMinutes: number;
    startAt: string;
    endAt: string;
    machineName: string;
    osLabel: string;
  }>;
};

export type SyncHealthBlock = {
  key: string;
  color: string;
  tooltip: string;
};

export type SyncHealth = {
  status: 'Healthy' | 'Degraded' | 'Offline';
  bridgeReachable: boolean;
  lastSyncAt: string;
  blocks: SyncHealthBlock[];
};

export type OverviewSnapshot = {
  range: OverviewRange;
  todayMinutes: number;
  weekMinutes: number;
  sessionCount: number;
  averageSessionMinutes: number;
  codingDaysThisWeek: number;
  lastActiveAt: string;
  trackingEnabled: boolean;
  localOnlyMode: boolean;
  lastUpdatedAt: string;
  currentMachine: MachineInfo;
  knownMachines: MachineInfo[];
  appStatus: AppStatus;
  lastActiveMachine: string;
  weeklyTrend: WeeklyTrendPoint[];
  todayTrendByInterval?: Record<TodayTrendInterval, WeeklyTrendPoint[]>;
  topProjects: TopProject[];
  topLanguages: TopLanguage[];
  machineDistribution: MachineTimeShare[];
  recentSessions: RecentSession[];
  activeHoursSummary: string;
  syncHealth: SyncHealth;
};
