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
  durationMinutes: number;
  startAt: string;
  machineName: string;
  osLabel: string;
};

export type SyncHealthBlock = {
  key: string;
  color: string;
  tooltip: string;
};

export type SyncHealth = {
  status: 'Healthy' | 'Degraded' | 'Offline';
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
  topProjects: TopProject[];
  topLanguages: TopLanguage[];
  machineDistribution: MachineTimeShare[];
  recentSessions: RecentSession[];
  activeHoursSummary: string;
  syncHealth: SyncHealth;
};
