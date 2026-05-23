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

export type TimeKpiPoint = {
  label: string;
  date: string;
  totalMinutes: number;
};

export type HeatmapKpiPoint = {
  index: number;
  label: string;
  totalMinutes: number;
};

export type SessionDurationKpis = {
  averageMinutes: number;
  medianMinutes: number;
  p90Minutes: number;
  longestMinutes: number;
};

export type SessionKpiSummary = {
  activeDays: number;
  currentStreakDays: number;
  longestStreakDays: number;
  rolling7DayAverageMinutes: number;
  rolling30DayAverageMinutes: number;
  previousPeriodDeltaPercent: number;
  bestDay: TimeKpiPoint;
  bestWeek: TimeKpiPoint;
  bestMonth: TimeKpiPoint;
  duration: SessionDurationKpis;
  deepWorkThresholdMinutes: number;
  deepWorkMinutes: number;
  deepWorkBlockCount: number;
  shortSessionThresholdMinutes: number;
  shortSessionCount: number;
  fragmentationScore: number;
  longestBreakMinutes: number;
  medianBreakMinutes: number;
  firstActiveAt?: string;
  lastActiveAt?: string;
  focusWindowStart?: string;
  focusWindowEnd?: string;
  weekdayHeatmap: HeatmapKpiPoint[];
  hourlyHeatmap: HeatmapKpiPoint[];
  consistencyScore: number;
};

export type ContextLeaderKpi = {
  name: string;
  totalMinutes: number;
  sessionCount: number;
  activeDays: number;
  shareOfTotal: number;
};

export type ContextMomentumPoint = {
  name: string;
  currentMinutes: number;
  previousMinutes: number;
  deltaPercent: number;
};

export type MachineTimeSplitPoint = {
  machineId: string;
  machineName: string;
  totalMinutes: number;
  shareOfTotal: number;
};

export type WorkspaceContinuityPoint = {
  workspaceId: string;
  projectCount: number;
  machineCount: number;
  eventCount: number;
  lastActiveAt?: string;
};

export type BranchTimePoint = {
  branchName: string;
  totalMinutes: number;
  eventCount: number;
  shareOfTotal: number;
  lastActiveAt?: string;
};

export type ProjectBranchTimePoint = {
  projectName: string;
  branchName: string;
  totalMinutes: number;
  eventCount: number;
  shareOfTotal: number;
};

export type EventTypeMixBucket = {
  name: string;
  totalEvents: number;
  editCount: number;
  saveCount: number;
  openCount: number;
  heartbeatCount: number;
  focusCount: number;
  blurCount: number;
};

export type EventActivityKpiSummary = {
  totalEvents: number;
  eventsInSessions: number;
  editCount: number;
  saveCount: number;
  openCount: number;
  heartbeatCount: number;
  focusCount: number;
  blurCount: number;
  activeEventCount: number;
  passiveEventCount: number;
  neutralEventCount: number;
  activeShare: number;
  passiveShare: number;
  neutralShare: number;
  eventDensityPerMinute: number;
  editSaveRatio: number;
  medianFirstOpenToFirstEditSeconds: number;
  medianEditToSaveSeconds: number;
  medianSessionWarmupSeconds: number;
  warmupQualifyingSessionCount: number;
  medianReturnAfterIdleMinutes: number;
  activityBurstCount: number;
  heartbeatOnlySessionCount: number;
  heartbeatOnlySessionShare: number;
  trackEditEvents: boolean;
  trackSaveEvents: boolean;
  trackFileOpenEvents: boolean;
  eventTypeMixByProject: EventTypeMixBucket[];
  eventTypeMixByLanguage: EventTypeMixBucket[];
  eventTypeMixByMachine: EventTypeMixBucket[];
};

export type FileCategory =
  | 'source'
  | 'test'
  | 'docs'
  | 'config'
  | 'build'
  | 'generated'
  | 'infrastructure'
  | 'other';

export type FileHotspot = {
  filePath: string;
  fileName: string;
  category: FileCategory;
  totalMinutes: number;
  eventCount: number;
  editCount: number;
  saveCount: number;
  shareOfTotal: number;
  lastActiveAt?: string;
};

export type FileCategoryBreakdown = {
  category: FileCategory;
  totalMinutes: number;
  eventCount: number;
  fileCount: number;
  shareOfTotal: number;
};

export type ProjectAreaBreakdown = {
  projectName: string;
  area: string;
  totalMinutes: number;
  eventCount: number;
  shareOfTotal: number;
};

export type FileFocusBlock = {
  filePath: string;
  fileName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  eventCount: number;
};

export type FileTestVsSource = {
  testMinutes: number;
  sourceMinutes: number;
  testShareOfCode: number;
};

export type FileKpiSummary = {
  optInEnabled: boolean;
  filePathsAvailable: boolean;
  pathsMasked: boolean;
  uniqueFileCount: number;
  averageUniqueFilesPerSession: number;
  totalAttributedMinutes: number;
  topFiles: FileHotspot[];
  mostRevisitedFiles: FileHotspot[];
  categoryBreakdown: FileCategoryBreakdown[];
  testVsSource: FileTestVsSource;
  documentationMinutes: number;
  configMinutes: number;
  infrastructureMinutes: number;
  fileChurnLeaders: FileHotspot[];
  longRunningFocusBlocks: FileFocusBlock[];
  projectAreaBreakdown: ProjectAreaBreakdown[];
};

export type InsightScoreDirection = 'higher-is-better' | 'lower-is-better';

export type InsightScoreInput = {
  label: string;
  value: number;
  score: number;
  weight: number;
};

export type InsightScore = {
  score: number;
  direction: InsightScoreDirection;
  inputs: InsightScoreInput[];
};

export type ProjectInvestmentScore = {
  projectName: string;
  score: number;
  totalMinutes: number;
  activeDays: number;
  momentumPercent: number;
  shareOfTotal: number;
};

export type InsightScoreSummary = {
  momentumScore: InsightScore;
  focusScore: InsightScore;
  consistencyScore: InsightScore;
  fragmentationScore: InsightScore;
  recoveryScore: InsightScore;
  trackingHealthScore: InsightScore;
  projectInvestmentScore: InsightScore;
  projectInvestmentBreakdown: ProjectInvestmentScore[];
};

export type ContextKpiSummary = {
  projectSwitchCount: number;
  projectSwitchRatePerDay: number;
  languageSwitchCount: number;
  languageSwitchRatePerDay: number;
  branchSwitchCount: number;
  branchSwitchRatePerDay: number;
  projectFocusScore: number;
  languageFocusScore: number;
  topProjectByTime: ContextLeaderKpi;
  topProjectBySessions: ContextLeaderKpi;
  topProjectByActiveDays: ContextLeaderKpi;
  topLanguageByTime: ContextLeaderKpi;
  topLanguageBySessions: ContextLeaderKpi;
  topLanguageByActiveDays: ContextLeaderKpi;
  projectMomentum: ContextMomentumPoint[];
  languageMomentum: ContextMomentumPoint[];
  machineTimeSplit: MachineTimeSplitPoint[];
  crossMachineResumeCount: number;
  crossMachineResumeRate: number;
  workspaceContinuity: WorkspaceContinuityPoint[];
  branchTime: BranchTimePoint[];
  projectBranchBreakdown: ProjectBranchTimePoint[];
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
  sessionKpis: SessionKpiSummary;
  contextKpis: ContextKpiSummary;
  eventKpis: EventActivityKpiSummary;
  fileKpis: FileKpiSummary;
  insightScores: InsightScoreSummary;
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
