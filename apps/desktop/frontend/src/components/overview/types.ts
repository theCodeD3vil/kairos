export type OverviewRange = 'today' | 'week' | 'month';

export type WeeklyTrendPoint = {
  label: string;
  value: number;
};

export type TopProject = {
  project: string;
  minutes: number;
  recentActivityAt: string;
};

export type TopLanguage = {
  language: string;
  minutes: number;
  share: number;
};

export type RecentSession = {
  project: string;
  durationMinutes: number;
  startAt: string;
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
  weeklyTrend: WeeklyTrendPoint[];
  topProjects: TopProject[];
  topLanguages: TopLanguage[];
  recentSessions: RecentSession[];
  activeHoursSummary: string;
};
