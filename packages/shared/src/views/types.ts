import type { LanguageSummary, MachineSummary, ProjectSummary, Session } from '../domain/types';
import type { MachineInfo } from '../ingestion/types';

export type WeeklyTrendPoint = {
  date: string;
  totalMinutes: number;
};

export type DailyTotalPoint = {
  date: string;
  totalMinutes: number;
};

export type OverviewData = {
  todayMinutes: number;
  weekMinutes: number;
  sessionCount: number;
  averageSessionMinutes: number;
  codingDaysThisWeek: number;
  lastActiveAt?: string;
  topProjects: ProjectSummary[];
  topLanguages: LanguageSummary[];
  recentSessions: Session[];
  weeklyTrend: WeeklyTrendPoint[];
  activeHoursSummary: string;
  trackingEnabled: boolean;
  localOnlyMode: boolean;
  currentMachine?: MachineInfo;
  lastUpdatedAt: string;
};

export type AnalyticsData = {
  rangeLabel: string;
  totalMinutes: number;
  activeDays: number;
  sessionCount: number;
  averageSessionMinutes: number;
  longestDayMinutes: number;
  previousPeriodMinutes?: number;
  dailyTotals: DailyTotalPoint[];
  projectSummaries: ProjectSummary[];
  languageSummaries: LanguageSummary[];
  machineSummaries: MachineSummary[];
  recentSessions: Session[];
};

export type CalendarDaySummary = {
  date: string;
  totalMinutes: number;
  sessionCount: number;
  topProject?: string;
  topLanguage?: string;
  machineCount: number;
  hadActivity: boolean;
};

export type CalendarMonthData = {
  month: string;
  monthLabel: string;
  days: CalendarDaySummary[];
};

export type CalendarDayData = {
  date: string;
  totalMinutes: number;
  sessionCount: number;
  averageSessionMinutes: number;
  firstActiveAt?: string;
  lastActiveAt?: string;
  topProject?: string;
  topLanguage?: string;
  projectBreakdown: ProjectSummary[];
  machineBreakdown: MachineSummary[];
  sessions: Session[];
  hadActivity: boolean;
};

export type ProjectsPageData = {
  rangeLabel: string;
  projects: ProjectSummary[];
};

export type SessionsPageData = {
  rangeLabel: string;
  totalSessions: number;
  averageSessionMinutes: number;
  longestSessionMinutes: number;
  sessions: Session[];
};
