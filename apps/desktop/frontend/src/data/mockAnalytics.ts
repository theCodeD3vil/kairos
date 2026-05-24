import type { DateRange } from '@/components/ruixen/range-calendar';

export type AnalyticsRange = 'today' | 'week' | 'month' | 'last-90-days' | 'all-time' | 'custom';

export type AnalyticsFilters = {
  range: AnalyticsRange;
  customRange?: DateRange | null;
  project: string;
  language: string;
  machine: string;
};

export type SessionRecord = {
  id: string;
  project: string;
  language: string;
  machine: string;
  start: string;
  durationMinutes: number;
};

export type RecentSessionRow = SessionRecord & {
  dayLabel: string;
  groupStart: string;
  groupEnd: string;
  sessionCount: number;
  machineCount: number;
  osLabel: string;
  subSessions: Array<{
    id: string;
    language: string;
    durationMinutes: number;
    start: string;
    end: string;
    machine: string;
    osLabel: string;
  }>;
};

export type DailyStat = {
  date: string;
  label: string;
  minutes: number;
};

export type BreakdownItem = {
  name: string;
  minutes: number;
  share: number;
  activeDays: number;
  recent: string;
};

export type MachineBreakdown = {
  name: string;
  minutes: number;
  share: number;
  lastActiveAt: string;
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

export type AnalyticsSnapshot = {
  summary: {
    totalMinutes: number;
    activeDays: number;
    sessions: number;
    averageSessionMinutes: number;
    comparison: {
      previousMinutes: number;
      previousSessions: number;
      previousActiveDays: number;
    };
  };
  sessionKpis: SessionKpiSummary;
  contextKpis: ContextKpiSummary;
  eventKpis: EventActivityKpiSummary;
  fileKpis: FileKpiSummary;
  insightScores: InsightScoreSummary;
  time: {
    daily: DailyStat[];
    weekly: Array<{ label: string; minutes: number }>;
    longestDay: DailyStat | null;
    averagePerActiveDay: number;
  };
  projects: {
    items: BreakdownItem[];
    topProject: string | null;
  };
  languages: {
    items: BreakdownItem[];
    topLanguage: string | null;
  };
  sessions: {
    recent: RecentSessionRow[];
    longestSession: number;
    averageSessionMinutes: number;
    totalSessions: number;
  };
  machines: {
    items: MachineBreakdown[];
    lastActiveMachine: string | null;
  };
  patterns: {
    mostActiveDay: string | null;
    mostActiveHour: string | null;
    streakDays: number;
    hourBuckets: Array<{ hourLabel: string; minutes: number }>;
  };
  comparison: {
    minutesDeltaPct: number;
    sessionsDeltaPct: number;
    activeDaysDeltaPct: number;
    topProjectChange: { current: string | null; previous: string | null };
    topLanguageChange: { current: string | null; previous: string | null };
  };
  filters: {
    projects: string[];
    languages: string[];
    machines: string[];
  };
};

const sessionData: SessionRecord[] = [
  {
    id: 's-0405-1',
    project: 'kairos-desktop',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-04-05T09:12:00',
    durationMinutes: 72,
  },
  {
    id: 's-0405-2',
    project: 'billing-api',
    language: 'Go',
    machine: 'Dev Desktop',
    start: '2026-04-05T11:03:00',
    durationMinutes: 54,
  },
  {
    id: 's-0405-3',
    project: 'kairos-vscode',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-04-05T14:10:00',
    durationMinutes: 63,
  },
  {
    id: 's-0404-1',
    project: 'kairos-desktop',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-04-04T10:02:00',
    durationMinutes: 88,
  },
  {
    id: 's-0404-2',
    project: 'billing-api',
    language: 'Go',
    machine: 'Ubuntu Workstation',
    start: '2026-04-04T13:22:00',
    durationMinutes: 47,
  },
  {
    id: 's-0404-3',
    project: 'studio-web',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-04-04T16:40:00',
    durationMinutes: 52,
  },
  {
    id: 's-0403-1',
    project: 'kairos-desktop',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-04-03T09:05:00',
    durationMinutes: 76,
  },
  {
    id: 's-0403-2',
    project: 'billing-api',
    language: 'Go',
    machine: 'Dev Desktop',
    start: '2026-04-03T12:18:00',
    durationMinutes: 69,
  },
  {
    id: 's-0403-3',
    project: 'studio-web',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-04-03T15:45:00',
    durationMinutes: 58,
  },
  {
    id: 's-0402-1',
    project: 'kairos-desktop',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-04-02T10:14:00',
    durationMinutes: 64,
  },
  {
    id: 's-0402-2',
    project: 'billing-api',
    language: 'Rust',
    machine: 'Ubuntu Workstation',
    start: '2026-04-02T13:02:00',
    durationMinutes: 51,
  },
  {
    id: 's-0402-3',
    project: 'studio-web',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-04-02T16:31:00',
    durationMinutes: 42,
  },
  {
    id: 's-0401-1',
    project: 'kairos-vscode',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-04-01T09:28:00',
    durationMinutes: 57,
  },
  {
    id: 's-0401-2',
    project: 'billing-api',
    language: 'Go',
    machine: 'Dev Desktop',
    start: '2026-04-01T11:50:00',
    durationMinutes: 63,
  },
  {
    id: 's-0331-1',
    project: 'kairos-desktop',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-03-31T10:07:00',
    durationMinutes: 71,
  },
  {
    id: 's-0331-2',
    project: 'studio-web',
    language: 'Python',
    machine: 'Dev Desktop',
    start: '2026-03-31T14:22:00',
    durationMinutes: 48,
  },
  {
    id: 's-0330-1',
    project: 'billing-api',
    language: 'Go',
    machine: 'Ubuntu Workstation',
    start: '2026-03-30T09:55:00',
    durationMinutes: 82,
  },
  {
    id: 's-0330-2',
    project: 'kairos-vscode',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-03-30T13:30:00',
    durationMinutes: 61,
  },
  {
    id: 's-0329-1',
    project: 'kairos-desktop',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-03-29T10:16:00',
    durationMinutes: 74,
  },
  {
    id: 's-0329-2',
    project: 'studio-web',
    language: 'Python',
    machine: 'Dev Desktop',
    start: '2026-03-29T12:55:00',
    durationMinutes: 39,
  },
  {
    id: 's-0328-1',
    project: 'billing-api',
    language: 'Go',
    machine: 'Dev Desktop',
    start: '2026-03-28T09:41:00',
    durationMinutes: 65,
  },
  {
    id: 's-0328-2',
    project: 'kairos-vscode',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-03-28T14:05:00',
    durationMinutes: 59,
  },
  {
    id: 's-0327-1',
    project: 'kairos-desktop',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-03-27T10:02:00',
    durationMinutes: 83,
  },
  {
    id: 's-0327-2',
    project: 'billing-api',
    language: 'Rust',
    machine: 'Ubuntu Workstation',
    start: '2026-03-27T13:18:00',
    durationMinutes: 50,
  },
  {
    id: 's-0326-1',
    project: 'studio-web',
    language: 'Python',
    machine: 'Dev Desktop',
    start: '2026-03-26T11:08:00',
    durationMinutes: 44,
  },
  {
    id: 's-0325-1',
    project: 'kairos-desktop',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-03-25T09:20:00',
    durationMinutes: 79,
  },
  {
    id: 's-0325-2',
    project: 'kairos-vscode',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-03-25T14:42:00',
    durationMinutes: 58,
  },
  {
    id: 's-0324-1',
    project: 'billing-api',
    language: 'Go',
    machine: 'Ubuntu Workstation',
    start: '2026-03-24T10:55:00',
    durationMinutes: 72,
  },
  {
    id: 's-0324-2',
    project: 'studio-web',
    language: 'Python',
    machine: 'Dev Desktop',
    start: '2026-03-24T15:03:00',
    durationMinutes: 46,
  },
  {
    id: 's-0323-1',
    project: 'kairos-desktop',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-03-23T09:14:00',
    durationMinutes: 68,
  },
  {
    id: 's-0323-2',
    project: 'billing-api',
    language: 'Go',
    machine: 'Dev Desktop',
    start: '2026-03-23T12:44:00',
    durationMinutes: 63,
  },
  {
    id: 's-0322-1',
    project: 'kairos-vscode',
    language: 'TypeScript',
    machine: "Myke's MacBook Pro",
    start: '2026-03-22T11:11:00',
    durationMinutes: 55,
  },
  {
    id: 's-0321-1',
    project: 'studio-web',
    language: 'Python',
    machine: 'Dev Desktop',
    start: '2026-03-21T09:50:00',
    durationMinutes: 52,
  },
  {
    id: 's-0320-1',
    project: 'billing-api',
    language: 'Go',
    machine: 'Dev Desktop',
    start: '2026-03-20T10:20:00',
    durationMinutes: 70,
  },
];

const deepWorkThresholdMinutes = 60;
const shortSessionThresholdMinutes = 15;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getRangeWindow(range: AnalyticsRange, customRange?: DateRange | null) {
  const end = startOfDay(new Date('2026-04-05T00:00:00'));

  if (range === 'custom' && customRange) {
    return {
      start: startOfDay(customRange.start),
      end: startOfDay(customRange.end),
    };
  }

  if (range === 'month') {
    const start = new Date(end.getFullYear(), end.getMonth(), 1);
    return { start, end };
  }

  if (range === 'all-time') {
    return { start: new Date('1970-01-01T00:00:00'), end };
  }

  const days = range === 'today' ? 1 : range === 'week' ? 7 : 30;
  const start = new Date(end.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  return { start, end };
}

function inRange(date: Date, start: Date, end: Date) {
  const time = date.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}

function computeDailyTotals(sessions: SessionRecord[]) {
  const map = new Map<string, number>();
  sessions.forEach((session) => {
    const key = session.start.slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + session.durationMinutes);
  });
  return Array.from(map.entries())
    .map(([date, minutes]) => ({
      date,
      label: formatDayLabel(new Date(date)),
      minutes,
    }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

function computeWeeklyTotals(daily: DailyStat[]) {
  const buckets = new Map<string, number>();
  daily.forEach((day) => {
    const d = new Date(day.date);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const key = weekStart.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + day.minutes);
  });

  return Array.from(buckets.entries())
    .sort(([leftWeekStart], [rightWeekStart]) => leftWeekStart.localeCompare(rightWeekStart))
    .map(([weekStart, minutes]) => {
      const labelDate = new Date(weekStart);
      const label = `${labelDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
      return { label, minutes };
    });
}

function computeBreakdown(
  sessions: SessionRecord[],
  field: 'project' | 'language' | 'machine',
  totalMinutes: number,
): BreakdownItem[] {
  const map = new Map<string, { minutes: number; dates: Set<string>; lastDate: string }>();

  sessions.forEach((session) => {
    const key = session[field];
    const day = session.start.slice(0, 10);
    const existing = map.get(key) ?? { minutes: 0, dates: new Set<string>(), lastDate: day };
    existing.minutes += session.durationMinutes;
    existing.dates.add(day);
    if (day > existing.lastDate) existing.lastDate = day;
    map.set(key, existing);
  });

  return Array.from(map.entries())
    .map(([name, value]) => ({
      name,
      minutes: value.minutes,
      share: totalMinutes === 0 ? 0 : Number(((value.minutes / totalMinutes) * 100).toFixed(1)),
      activeDays: value.dates.size,
      recent: formatDayLabel(new Date(value.lastDate)),
    }))
    .sort((a, b) => b.minutes - a.minutes);
}

function computeHourBuckets(sessions: SessionRecord[]) {
  const map = new Map<number, number>();
  sessions.forEach((session) => {
    const hour = new Date(session.start).getHours();
    map.set(hour, (map.get(hour) ?? 0) + session.durationMinutes);
  });
  return Array.from(map.entries())
    .map(([hour, minutes]) => ({
      hourLabel: `${hour.toString().padStart(2, '0')}:00`,
      minutes,
    }))
    .sort((a, b) => a.hourLabel.localeCompare(b.hourLabel));
}

function summarizeLanguages(languages: Set<string>) {
  const values = [...languages].filter(Boolean);
  if (values.length === 0) return 'Unknown';
  if (values.length === 1) return values[0];
  return `Mixed (${values.length})`;
}

function groupRecentSessions(sessions: SessionRecord[]): RecentSessionRow[] {
  const grouped = new Map<
    string,
    {
      dateKey: string;
      project: string;
      latestStart: string;
      earliestStart: string;
      latestEnd: string;
      durationMinutes: number;
      sessionCount: number;
      languages: Set<string>;
      machines: Set<string>;
      subSessions: Array<{
        id: string;
        language: string;
        durationMinutes: number;
        start: string;
        end: string;
        machine: string;
        osLabel: string;
      }>;
    }
  >();

  sessions.forEach((session) => {
    const dateKey = session.start.slice(0, 10);
    const key = `${dateKey}\u0000${session.project}`;
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        dateKey,
        project: session.project,
        latestStart: session.start,
        earliestStart: session.start,
        latestEnd: session.start,
        durationMinutes: session.durationMinutes,
        sessionCount: 1,
        languages: new Set([session.language]),
        machines: new Set([session.machine]),
        subSessions: [
          {
            id: session.id,
            language: session.language,
            durationMinutes: session.durationMinutes,
            start: session.start,
            end: session.start,
            machine: session.machine,
            osLabel: 'Unknown OS',
          },
        ],
      });
      return;
    }

    existing.durationMinutes += session.durationMinutes;
    existing.sessionCount += 1;
    existing.languages.add(session.language);
    existing.machines.add(session.machine);
    existing.subSessions.push({
      id: session.id,
      language: session.language,
      durationMinutes: session.durationMinutes,
      start: session.start,
      end: session.start,
      machine: session.machine,
      osLabel: 'Unknown OS',
    });
    if (session.start > existing.latestStart) {
      existing.latestStart = session.start;
    }
    if (session.start < existing.earliestStart) {
      existing.earliestStart = session.start;
    }
    if (session.start > existing.latestEnd) {
      existing.latestEnd = session.start;
    }
  });

  return Array.from(grouped.values())
    .sort((a, b) => (a.latestStart < b.latestStart ? 1 : -1))
    .slice(0, 8)
    .map((group) => {
      const machineCount = group.machines.size;
      return {
        id: `${group.dateKey}:${group.project}`,
        project: group.project,
        language: summarizeLanguages(group.languages),
        machine: machineCount > 1 ? `${machineCount} machines` : Array.from(group.machines)[0],
        start: group.latestStart,
        groupStart: group.earliestStart,
        groupEnd: group.latestEnd,
        durationMinutes: group.durationMinutes,
        dayLabel: formatDayLabel(new Date(group.dateKey)),
        sessionCount: group.sessionCount,
        machineCount,
        osLabel: machineCount > 1 ? 'Mixed OS' : 'Unknown OS',
        subSessions: [...group.subSessions].sort((a, b) => (a.start < b.start ? 1 : -1)),
      };
    });
}

function computeStreak(daily: DailyStat[]) {
  if (daily.length === 0) return 0;
  const dates = daily.map((d) => new Date(d.date).getTime()).sort((a, b) => b - a);
  let streak = 1;
  for (let i = 1; i < dates.length; i += 1) {
    const diff = (dates[i - 1] - dates[i]) / (24 * 60 * 60 * 1000);
    if (diff === 1) streak += 1;
    else break;
  }
  return streak;
}

function formatClockMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function roundOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function computeDelta(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return roundOneDecimal(((current - previous) / previous) * 100);
}

function percentOfTotal(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return roundOneDecimal((value / total) * 100);
}

function emptyTimeKpiPoint(): TimeKpiPoint {
  return { label: '', date: '', totalMinutes: 0 };
}

function bestTimeKpiPoint(totals: Map<string, number>): TimeKpiPoint {
  let best = emptyTimeKpiPoint();
  for (const [date, totalMinutes] of totals.entries()) {
    if (totalMinutes <= 0) continue;
    if (
      totalMinutes > best.totalMinutes ||
      (totalMinutes === best.totalMinutes && (!best.date || date < best.date))
    ) {
      best = {
        date,
        label: date.length === 10 ? formatDayLabel(new Date(date)) : date,
        totalMinutes,
      };
    }
  }
  return best;
}

function dateKeysBetween(start: Date, end: Date) {
  const dates: string[] = [];
  for (
    let current = startOfDay(start);
    current.getTime() <= startOfDay(end).getTime();
    current.setDate(current.getDate() + 1)
  ) {
    dates.push(current.toISOString().slice(0, 10));
  }
  return dates;
}

function computeDurationKpis(sessions: SessionRecord[]): SessionDurationKpis {
  const durations = sessions
    .map((session) => session.durationMinutes)
    .filter((duration) => duration > 0)
    .sort((left, right) => left - right);
  if (durations.length === 0) {
    return {
      averageMinutes: 0,
      medianMinutes: 0,
      p90Minutes: 0,
      longestMinutes: 0,
    };
  }

  const midpoint = Math.floor(durations.length / 2);
  const medianMinutes =
    durations.length % 2 === 1
      ? durations[midpoint]
      : Math.round((durations[midpoint - 1] + durations[midpoint]) / 2);
  const p90Index = Math.min(durations.length - 1, Math.ceil(durations.length * 0.9) - 1);
  return {
    averageMinutes: Math.round(
      durations.reduce((sum, duration) => sum + duration, 0) / durations.length,
    ),
    medianMinutes,
    p90Minutes: durations[p90Index],
    longestMinutes: durations[durations.length - 1],
  };
}

function sessionEnd(session: SessionRecord) {
  return new Date(new Date(session.start).getTime() + session.durationMinutes * 60_000);
}

function computeBreakMetrics(sessions: SessionRecord[]) {
  const ordered = [...sessions].sort((left, right) => left.start.localeCompare(right.start));
  const gaps: number[] = [];
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (previous.start.slice(0, 10) !== current.start.slice(0, 10)) continue;
    const gapMinutes = Math.ceil(
      (new Date(current.start).getTime() - sessionEnd(previous).getTime()) / 60_000,
    );
    if (gapMinutes > 0) {
      gaps.push(gapMinutes);
    }
  }
  if (gaps.length === 0) {
    return { longestBreakMinutes: 0, medianBreakMinutes: 0 };
  }

  gaps.sort((left, right) => left - right);
  const midpoint = Math.floor(gaps.length / 2);
  const medianBreakMinutes =
    gaps.length % 2 === 1 ? gaps[midpoint] : Math.round((gaps[midpoint - 1] + gaps[midpoint]) / 2);
  return {
    longestBreakMinutes: gaps[gaps.length - 1],
    medianBreakMinutes,
  };
}

function computeActivityBounds(sessions: SessionRecord[]) {
  let firstActiveAt = '';
  let lastActiveAt = '';
  let earliestMinute = 0;
  let latestMinute = 0;
  let hasClock = false;

  for (const session of sessions) {
    const start = new Date(session.start);
    const end = sessionEnd(session);
    if (!firstActiveAt || session.start < firstActiveAt) {
      firstActiveAt = session.start;
    }
    const endIso = end.toISOString();
    if (!lastActiveAt || endIso > lastActiveAt) {
      lastActiveAt = endIso;
    }
    const startMinute = start.getHours() * 60 + start.getMinutes();
    const endMinute = end.getHours() * 60 + end.getMinutes();
    if (!hasClock || startMinute < earliestMinute) {
      earliestMinute = startMinute;
    }
    if (!hasClock || endMinute > latestMinute) {
      latestMinute = endMinute;
    }
    hasClock = true;
  }

  return {
    firstActiveAt: firstActiveAt || undefined,
    lastActiveAt: lastActiveAt || undefined,
    focusWindowStart: hasClock ? formatClockMinutes(earliestMinute) : undefined,
    focusWindowEnd: hasClock ? formatClockMinutes(latestMinute) : undefined,
  };
}

function computeWeekdayHeatmap(sessions: SessionRecord[]): HeatmapKpiPoint[] {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const totals = Array.from({ length: labels.length }, () => 0);
  sessions.forEach((session) => {
    const day = new Date(session.start);
    const index = (day.getDay() + 6) % 7;
    totals[index] += session.durationMinutes;
  });
  return labels.map((label, index) => ({ index, label, totalMinutes: totals[index] }));
}

function computeHourlyHeatmap(sessions: SessionRecord[]): HeatmapKpiPoint[] {
  const totals = Array.from({ length: 24 }, () => 0);
  sessions.forEach((session) => {
    let current = new Date(session.start);
    let remaining = session.durationMinutes;
    while (remaining > 0) {
      const nextHour = new Date(current);
      nextHour.setHours(current.getHours() + 1, 0, 0, 0);
      const minutesUntilHour = Math.max(
        1,
        Math.ceil((nextHour.getTime() - current.getTime()) / 60_000),
      );
      const allocated = Math.min(remaining, minutesUntilHour);
      totals[current.getHours()] += allocated;
      remaining -= allocated;
      current = new Date(current.getTime() + allocated * 60_000);
    }
  });
  return totals.map((totalMinutes, index) => ({
    index,
    label: `${String(index).padStart(2, '0')}:00`,
    totalMinutes,
  }));
}

function computeSessionKpis(
  sessions: SessionRecord[],
  range: { start: Date; end: Date },
  previousMinutes: number,
): SessionKpiSummary {
  const daily = computeDailyTotals(sessions);
  const dailyTotals = new Map(daily.map((day) => [day.date, day.minutes]));
  const activeDates = new Set(daily.map((day) => day.date));
  const totalMinutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const weekTotals = new Map<string, number>();
  const monthTotals = new Map<string, number>();
  let deepWorkMinutes = 0;
  let deepWorkBlockCount = 0;
  let shortSessionCount = 0;

  sessions.forEach((session) => {
    const start = new Date(session.start);
    const weekStart = new Date(start);
    weekStart.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    const weekKey = weekStart.toISOString().slice(0, 10);
    weekTotals.set(weekKey, (weekTotals.get(weekKey) ?? 0) + session.durationMinutes);
    const monthKey = session.start.slice(0, 7);
    monthTotals.set(monthKey, (monthTotals.get(monthKey) ?? 0) + session.durationMinutes);

    if (session.durationMinutes >= deepWorkThresholdMinutes) {
      deepWorkMinutes += session.durationMinutes;
      deepWorkBlockCount += 1;
    }
    if (session.durationMinutes > 0 && session.durationMinutes < shortSessionThresholdMinutes) {
      shortSessionCount += 1;
    }
  });

  const rangeDates = dateKeysBetween(range.start, range.end);
  const rollingAverage = (days: number) => {
    const keys = rangeDates.slice(Math.max(0, rangeDates.length - days));
    if (keys.length === 0) return 0;
    return Math.round(
      keys.reduce((sum, key) => sum + (dailyTotals.get(key) ?? 0), 0) / keys.length,
    );
  };

  const currentStreakDays = (() => {
    let streak = 0;
    for (let index = rangeDates.length - 1; index >= 0; index -= 1) {
      if (!activeDates.has(rangeDates[index])) break;
      streak += 1;
    }
    return streak;
  })();

  const longestStreakDays = (() => {
    let longest = 0;
    let current = 0;
    rangeDates.forEach((date) => {
      if (activeDates.has(date)) {
        current += 1;
        longest = Math.max(longest, current);
      } else {
        current = 0;
      }
    });
    return longest;
  })();

  const breakMetrics = computeBreakMetrics(sessions);
  const activityBounds = computeActivityBounds(sessions);

  return {
    activeDays: activeDates.size,
    currentStreakDays,
    longestStreakDays,
    rolling7DayAverageMinutes: rollingAverage(7),
    rolling30DayAverageMinutes: rollingAverage(30),
    previousPeriodDeltaPercent: computeDelta(totalMinutes, previousMinutes),
    bestDay: bestTimeKpiPoint(dailyTotals),
    bestWeek: bestTimeKpiPoint(weekTotals),
    bestMonth: bestTimeKpiPoint(monthTotals),
    duration: computeDurationKpis(sessions),
    deepWorkThresholdMinutes,
    deepWorkMinutes,
    deepWorkBlockCount,
    shortSessionThresholdMinutes,
    shortSessionCount,
    fragmentationScore: percentOfTotal(shortSessionCount, sessions.length),
    longestBreakMinutes: breakMetrics.longestBreakMinutes,
    medianBreakMinutes: breakMetrics.medianBreakMinutes,
    firstActiveAt: activityBounds.firstActiveAt,
    lastActiveAt: activityBounds.lastActiveAt,
    focusWindowStart: activityBounds.focusWindowStart,
    focusWindowEnd: activityBounds.focusWindowEnd,
    weekdayHeatmap: computeWeekdayHeatmap(sessions),
    hourlyHeatmap: computeHourlyHeatmap(sessions),
    consistencyScore: percentOfTotal(activeDates.size, rangeDates.length),
  };
}

function emptyContextLeader(): ContextLeaderKpi {
  return { name: '', totalMinutes: 0, sessionCount: 0, activeDays: 0, shareOfTotal: 0 };
}

function breakdownToLeader(item?: BreakdownItem): ContextLeaderKpi {
  if (!item) {
    return emptyContextLeader();
  }
  return {
    name: item.name,
    totalMinutes: item.minutes,
    sessionCount: 0,
    activeDays: item.activeDays,
    shareOfTotal: item.share,
  };
}

function contextSwitchCount(sessions: SessionRecord[], field: 'project' | 'language') {
  const ordered = [...sessions].sort((left, right) => left.start.localeCompare(right.start));
  let switches = 0;
  let previous = '';
  ordered.forEach((session) => {
    const current = session[field].trim();
    if (!current) {
      return;
    }
    if (previous && previous !== current) {
      switches += 1;
    }
    previous = current;
  });
  return switches;
}

function ratePerDay(count: number, dayCount: number) {
  if (count <= 0 || dayCount <= 0) {
    return 0;
  }
  return Math.round((count / dayCount) * 10) / 10;
}

function computeContextMomentum(
  sessions: SessionRecord[],
  range: { start: Date; end: Date },
  field: 'project' | 'language',
): ContextMomentumPoint[] {
  const currentStart = new Date(range.end);
  currentStart.setDate(currentStart.getDate() - 6);
  const previousEnd = new Date(currentStart);
  previousEnd.setDate(previousEnd.getDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - 6);
  const currentTotals = new Map<string, number>();
  const previousTotals = new Map<string, number>();

  sessions.forEach((session) => {
    const name = session[field].trim();
    if (!name) {
      return;
    }
    const day = startOfDay(new Date(session.start));
    if (inRange(day, currentStart, range.end)) {
      currentTotals.set(name, (currentTotals.get(name) ?? 0) + session.durationMinutes);
    } else if (inRange(day, previousStart, previousEnd)) {
      previousTotals.set(name, (previousTotals.get(name) ?? 0) + session.durationMinutes);
    }
  });

  return unique([...currentTotals.keys(), ...previousTotals.keys()])
    .map((name) => {
      const currentMinutes = currentTotals.get(name) ?? 0;
      const previousMinutes = previousTotals.get(name) ?? 0;
      return {
        name,
        currentMinutes,
        previousMinutes,
        deltaPercent: computeDelta(currentMinutes, previousMinutes),
      };
    })
    .sort((left, right) => {
      if (right.currentMinutes !== left.currentMinutes) {
        return right.currentMinutes - left.currentMinutes;
      }
      return left.name.localeCompare(right.name);
    })
    .slice(0, 5);
}

function computeContextKpis(
  sessions: SessionRecord[],
  range: { start: Date; end: Date },
  projectBreakdown: BreakdownItem[],
  languageBreakdown: BreakdownItem[],
  machineBreakdown: BreakdownItem[],
): ContextKpiSummary {
  const activeDays = computeDailyTotals(sessions).length;
  const projectSwitchCount = contextSwitchCount(sessions, 'project');
  const languageSwitchCount = contextSwitchCount(sessions, 'language');
  const machineTotal = machineBreakdown.reduce((sum, item) => sum + item.minutes, 0);

  return {
    projectSwitchCount,
    projectSwitchRatePerDay: ratePerDay(projectSwitchCount, activeDays),
    languageSwitchCount,
    languageSwitchRatePerDay: ratePerDay(languageSwitchCount, activeDays),
    branchSwitchCount: 0,
    branchSwitchRatePerDay: 0,
    projectFocusScore: projectBreakdown[0]?.share ?? 0,
    languageFocusScore: languageBreakdown[0]?.share ?? 0,
    topProjectByTime: breakdownToLeader(projectBreakdown[0]),
    topProjectBySessions: breakdownToLeader(projectBreakdown[0]),
    topProjectByActiveDays: breakdownToLeader(
      [...projectBreakdown].sort((left, right) => right.activeDays - left.activeDays)[0],
    ),
    topLanguageByTime: breakdownToLeader(languageBreakdown[0]),
    topLanguageBySessions: breakdownToLeader(languageBreakdown[0]),
    topLanguageByActiveDays: breakdownToLeader(
      [...languageBreakdown].sort((left, right) => right.activeDays - left.activeDays)[0],
    ),
    projectMomentum: computeContextMomentum(sessions, range, 'project'),
    languageMomentum: computeContextMomentum(sessions, range, 'language'),
    machineTimeSplit: machineBreakdown.map((item) => ({
      machineId: item.name,
      machineName: item.name,
      totalMinutes: item.minutes,
      shareOfTotal: percentOfTotal(item.minutes, machineTotal),
    })),
    crossMachineResumeCount: 0,
    crossMachineResumeRate: 0,
    workspaceContinuity: [],
    branchTime: [],
    projectBranchBreakdown: [],
  };
}

function windowSessions(range: { start: Date; end: Date }, filters: AnalyticsFilters) {
  return sessionData.filter((session) => {
    const date = startOfDay(new Date(session.start));
    if (!inRange(date, range.start, range.end)) return false;
    if (filters.project !== 'all' && session.project !== filters.project) return false;
    if (filters.language !== 'all' && session.language !== filters.language) return false;
    if (filters.machine !== 'all' && session.machine !== filters.machine) return false;
    return true;
  });
}

export function emptyFileKpis(): FileKpiSummary {
  return {
    optInEnabled: false,
    filePathsAvailable: false,
    pathsMasked: false,
    uniqueFileCount: 0,
    averageUniqueFilesPerSession: 0,
    totalAttributedMinutes: 0,
    topFiles: [],
    mostRevisitedFiles: [],
    categoryBreakdown: [],
    testVsSource: { testMinutes: 0, sourceMinutes: 0, testShareOfCode: 0 },
    documentationMinutes: 0,
    configMinutes: 0,
    infrastructureMinutes: 0,
    fileChurnLeaders: [],
    longRunningFocusBlocks: [],
    projectAreaBreakdown: [],
  };
}

export function emptyEventActivityKpis(): EventActivityKpiSummary {
  return {
    totalEvents: 0,
    eventsInSessions: 0,
    editCount: 0,
    saveCount: 0,
    openCount: 0,
    heartbeatCount: 0,
    focusCount: 0,
    blurCount: 0,
    activeEventCount: 0,
    passiveEventCount: 0,
    neutralEventCount: 0,
    activeShare: 0,
    passiveShare: 0,
    neutralShare: 0,
    eventDensityPerMinute: 0,
    editSaveRatio: 0,
    medianFirstOpenToFirstEditSeconds: 0,
    medianEditToSaveSeconds: 0,
    medianSessionWarmupSeconds: 0,
    warmupQualifyingSessionCount: 0,
    medianReturnAfterIdleMinutes: 0,
    activityBurstCount: 0,
    heartbeatOnlySessionCount: 0,
    heartbeatOnlySessionShare: 0,
    trackEditEvents: false,
    trackSaveEvents: false,
    trackFileOpenEvents: false,
    eventTypeMixByProject: [],
    eventTypeMixByLanguage: [],
    eventTypeMixByMachine: [],
  };
}

export function emptyInsightScore(direction: InsightScoreDirection = 'higher-is-better'): InsightScore {
  return {
    score: 0,
    direction,
    inputs: [],
  };
}

export function emptyInsightScores(): InsightScoreSummary {
  return {
    momentumScore: emptyInsightScore(),
    focusScore: emptyInsightScore(),
    consistencyScore: emptyInsightScore(),
    fragmentationScore: emptyInsightScore('lower-is-better'),
    recoveryScore: emptyInsightScore(),
    trackingHealthScore: emptyInsightScore(),
    projectInvestmentScore: emptyInsightScore(),
    projectInvestmentBreakdown: [],
  };
}

export function getAnalyticsSnapshot(filters: AnalyticsFilters): AnalyticsSnapshot {
  const window = getRangeWindow(filters.range, filters.customRange);
  const durationDays =
    Math.floor((window.end.getTime() - window.start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const previousWindow = {
    start: new Date(window.start.getTime() - durationDays * 24 * 60 * 60 * 1000),
    end: new Date(window.start.getTime() - 24 * 60 * 60 * 1000),
  };

  const sessions = windowSessions(window, filters);
  const previousSessions = windowSessions(previousWindow, filters);

  const totalMinutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const previousMinutes = previousSessions.reduce(
    (sum, session) => sum + session.durationMinutes,
    0,
  );

  const daily = computeDailyTotals(sessions);
  const weekly = computeWeeklyTotals(daily);
  const longestDay = daily.reduce<DailyStat | null>((acc, day) => {
    if (!acc || day.minutes > acc.minutes) return day;
    return acc;
  }, null);

  const averagePerActiveDay = daily.length === 0 ? 0 : Math.round(totalMinutes / daily.length);
  const activeDays = daily.length;

  const breakdownProjects = computeBreakdown(sessions, 'project', totalMinutes);
  const breakdownLanguages = computeBreakdown(sessions, 'language', totalMinutes);
  const breakdownMachines = computeBreakdown(sessions, 'machine', totalMinutes);

  const longestSession = sessions.reduce(
    (max, session) => Math.max(max, session.durationMinutes),
    0,
  );
  const averageSessionMinutes =
    sessions.length === 0 ? 0 : Math.round(totalMinutes / sessions.length);

  const hourBuckets = computeHourBuckets(sessions);
  const mostActiveHour =
    hourBuckets.reduce<{ hourLabel: string; minutes: number } | null>((acc, bucket) => {
      if (!acc || bucket.minutes > acc.minutes) return bucket;
      return acc;
    }, null)?.hourLabel ?? null;

  const streakDays = computeStreak(daily);

  const mostActiveDay = longestDay?.label ?? null;

  const previousActiveDays = computeDailyTotals(previousSessions).length;
  const comparisonMinutesDelta =
    previousMinutes === 0 ? 100 : ((totalMinutes - previousMinutes) / previousMinutes) * 100;
  const comparisonSessionsDelta =
    previousSessions.length === 0
      ? 100
      : ((sessions.length - previousSessions.length) / previousSessions.length) * 100;
  const comparisonActiveDaysDelta =
    previousActiveDays === 0 ? 100 : ((activeDays - previousActiveDays) / previousActiveDays) * 100;

  const recentSessions = groupRecentSessions(sessions);

  const projectChange = {
    current: breakdownProjects[0]?.name ?? null,
    previous: computeBreakdown(previousSessions, 'project', previousMinutes)[0]?.name ?? null,
  };

  const languageChange = {
    current: breakdownLanguages[0]?.name ?? null,
    previous: computeBreakdown(previousSessions, 'language', previousMinutes)[0]?.name ?? null,
  };

  return {
    summary: {
      totalMinutes,
      activeDays,
      sessions: sessions.length,
      averageSessionMinutes,
      comparison: {
        previousMinutes,
        previousSessions: previousSessions.length,
        previousActiveDays,
      },
    },
    sessionKpis: computeSessionKpis(sessions, window, previousMinutes),
    contextKpis: computeContextKpis(
      sessions,
      window,
      breakdownProjects,
      breakdownLanguages,
      breakdownMachines,
    ),
    eventKpis: emptyEventActivityKpis(),
    fileKpis: emptyFileKpis(),
    insightScores: emptyInsightScores(),
    time: {
      daily,
      weekly,
      longestDay,
      averagePerActiveDay,
    },
    projects: {
      items: breakdownProjects,
      topProject: breakdownProjects[0]?.name ?? null,
    },
    languages: {
      items: breakdownLanguages,
      topLanguage: breakdownLanguages[0]?.name ?? null,
    },
    sessions: {
      recent: recentSessions,
      longestSession,
      averageSessionMinutes,
      totalSessions: sessions.length,
    },
    machines: {
      items: breakdownMachines.map((machine) => ({
        ...machine,
        lastActiveAt: machine.recent,
      })),
      lastActiveMachine: breakdownMachines[0]?.name ?? null,
    },
    patterns: {
      mostActiveDay,
      mostActiveHour,
      streakDays,
      hourBuckets,
    },
    comparison: {
      minutesDeltaPct: Math.round(comparisonMinutesDelta * 10) / 10,
      sessionsDeltaPct: Math.round(comparisonSessionsDelta * 10) / 10,
      activeDaysDeltaPct: Math.round(comparisonActiveDaysDelta * 10) / 10,
      topProjectChange: projectChange,
      topLanguageChange: languageChange,
    },
    filters: {
      projects: unique(sessionData.map((s) => s.project)),
      languages: unique(sessionData.map((s) => s.language)),
      machines: unique(sessionData.map((s) => s.machine)),
    },
  };
}

export const analyticsDefaultFilters: AnalyticsFilters = {
  range: 'week',
  customRange: null,
  project: 'all',
  language: 'all',
  machine: 'all',
};
