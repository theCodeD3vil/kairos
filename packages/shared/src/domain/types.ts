export type Session = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  projectName: string;
  language: string;
  machineId: string;
  machineName?: string;
  sourceEventCount?: number;
};

export type SessionStats = {
  totalSessions: number;
  averageSessionMinutes: number;
  longestSessionMinutes: number;
};

export type SessionRebuildResult = {
  processedEventCount: number;
  createdSessionCount: number;
  startDate: string;
  endDate: string;
  rebuiltAt: string;
};

export type DailySummary = {
  date: string;
  totalMinutes: number;
  sessionCount: number;
  averageSessionMinutes: number;
  longestSessionMinutes: number;
  firstActiveAt?: string;
  lastActiveAt?: string;
  topProject?: string;
  topLanguage?: string;
  machineCount: number;
  hadActivity: boolean;
};

export type ProjectSummary = {
  projectName: string;
  totalMinutes: number;
  sessionCount: number;
  activeDays: number;
  shareOfTotal: number;
  lastActiveAt?: string;
};

export type LanguageSummary = {
  language: string;
  totalMinutes: number;
  sessionCount: number;
  activeDays: number;
  shareOfTotal: number;
  lastActiveAt?: string;
};

export type MachineSummary = {
  machineId: string;
  machineName: string;
  osPlatform?: import('../ingestion/types').OsPlatform;
  totalMinutes: number;
  sessionCount: number;
  activeDays: number;
  lastActiveAt?: string;
};
