import type { DateRange } from '@/components/ruixen/range-calendar';

export type AnalyticsRange = 'today' | 'week' | 'month' | 'custom';

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
  { id: 's-0405-1', project: 'kairos-desktop', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-04-05T09:12:00', durationMinutes: 72 },
  { id: 's-0405-2', project: 'billing-api', language: 'Go', machine: 'Dev Desktop', start: '2026-04-05T11:03:00', durationMinutes: 54 },
  { id: 's-0405-3', project: 'kairos-vscode', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-04-05T14:10:00', durationMinutes: 63 },
  { id: 's-0404-1', project: 'kairos-desktop', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-04-04T10:02:00', durationMinutes: 88 },
  { id: 's-0404-2', project: 'billing-api', language: 'Go', machine: 'Ubuntu Workstation', start: '2026-04-04T13:22:00', durationMinutes: 47 },
  { id: 's-0404-3', project: 'studio-web', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-04-04T16:40:00', durationMinutes: 52 },
  { id: 's-0403-1', project: 'kairos-desktop', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-04-03T09:05:00', durationMinutes: 76 },
  { id: 's-0403-2', project: 'billing-api', language: 'Go', machine: 'Dev Desktop', start: '2026-04-03T12:18:00', durationMinutes: 69 },
  { id: 's-0403-3', project: 'studio-web', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-04-03T15:45:00', durationMinutes: 58 },
  { id: 's-0402-1', project: 'kairos-desktop', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-04-02T10:14:00', durationMinutes: 64 },
  { id: 's-0402-2', project: 'billing-api', language: 'Rust', machine: 'Ubuntu Workstation', start: '2026-04-02T13:02:00', durationMinutes: 51 },
  { id: 's-0402-3', project: 'studio-web', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-04-02T16:31:00', durationMinutes: 42 },
  { id: 's-0401-1', project: 'kairos-vscode', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-04-01T09:28:00', durationMinutes: 57 },
  { id: 's-0401-2', project: 'billing-api', language: 'Go', machine: 'Dev Desktop', start: '2026-04-01T11:50:00', durationMinutes: 63 },
  { id: 's-0331-1', project: 'kairos-desktop', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-03-31T10:07:00', durationMinutes: 71 },
  { id: 's-0331-2', project: 'studio-web', language: 'Python', machine: 'Dev Desktop', start: '2026-03-31T14:22:00', durationMinutes: 48 },
  { id: 's-0330-1', project: 'billing-api', language: 'Go', machine: 'Ubuntu Workstation', start: '2026-03-30T09:55:00', durationMinutes: 82 },
  { id: 's-0330-2', project: 'kairos-vscode', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-03-30T13:30:00', durationMinutes: 61 },
  { id: 's-0329-1', project: 'kairos-desktop', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-03-29T10:16:00', durationMinutes: 74 },
  { id: 's-0329-2', project: 'studio-web', language: 'Python', machine: 'Dev Desktop', start: '2026-03-29T12:55:00', durationMinutes: 39 },
  { id: 's-0328-1', project: 'billing-api', language: 'Go', machine: 'Dev Desktop', start: '2026-03-28T09:41:00', durationMinutes: 65 },
  { id: 's-0328-2', project: 'kairos-vscode', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-03-28T14:05:00', durationMinutes: 59 },
  { id: 's-0327-1', project: 'kairos-desktop', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-03-27T10:02:00', durationMinutes: 83 },
  { id: 's-0327-2', project: 'billing-api', language: 'Rust', machine: 'Ubuntu Workstation', start: '2026-03-27T13:18:00', durationMinutes: 50 },
  { id: 's-0326-1', project: 'studio-web', language: 'Python', machine: 'Dev Desktop', start: '2026-03-26T11:08:00', durationMinutes: 44 },
  { id: 's-0325-1', project: 'kairos-desktop', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-03-25T09:20:00', durationMinutes: 79 },
  { id: 's-0325-2', project: 'kairos-vscode', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-03-25T14:42:00', durationMinutes: 58 },
  { id: 's-0324-1', project: 'billing-api', language: 'Go', machine: 'Ubuntu Workstation', start: '2026-03-24T10:55:00', durationMinutes: 72 },
  { id: 's-0324-2', project: 'studio-web', language: 'Python', machine: 'Dev Desktop', start: '2026-03-24T15:03:00', durationMinutes: 46 },
  { id: 's-0323-1', project: 'kairos-desktop', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-03-23T09:14:00', durationMinutes: 68 },
  { id: 's-0323-2', project: 'billing-api', language: 'Go', machine: 'Dev Desktop', start: '2026-03-23T12:44:00', durationMinutes: 63 },
  { id: 's-0322-1', project: 'kairos-vscode', language: 'TypeScript', machine: "Myke's MacBook Pro", start: '2026-03-22T11:11:00', durationMinutes: 55 },
  { id: 's-0321-1', project: 'studio-web', language: 'Python', machine: 'Dev Desktop', start: '2026-03-21T09:50:00', durationMinutes: 52 },
  { id: 's-0320-1', project: 'billing-api', language: 'Go', machine: 'Dev Desktop', start: '2026-03-20T10:20:00', durationMinutes: 70 },
];

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
  const grouped = new Map<string, {
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
  }>();

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
        subSessions: [{
          id: session.id,
          language: session.language,
          durationMinutes: session.durationMinutes,
          start: session.start,
          end: session.start,
          machine: session.machine,
          osLabel: 'Unknown OS',
        }],
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

export function getAnalyticsSnapshot(filters: AnalyticsFilters): AnalyticsSnapshot {
  const window = getRangeWindow(filters.range, filters.customRange);
  const durationDays = Math.floor((window.end.getTime() - window.start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
  const previousWindow = {
    start: new Date(window.start.getTime() - durationDays * 24 * 60 * 60 * 1000),
    end: new Date(window.start.getTime() - 24 * 60 * 60 * 1000),
  };

  const sessions = windowSessions(window, filters);
  const previousSessions = windowSessions(previousWindow, filters);

  const totalMinutes = sessions.reduce((sum, session) => sum + session.durationMinutes, 0);
  const previousMinutes = previousSessions.reduce((sum, session) => sum + session.durationMinutes, 0);

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

  const longestSession = sessions.reduce((max, session) => Math.max(max, session.durationMinutes), 0);
  const averageSessionMinutes = sessions.length === 0 ? 0 : Math.round(totalMinutes / sessions.length);

  const hourBuckets = computeHourBuckets(sessions);
  const mostActiveHour = hourBuckets.reduce<{ hourLabel: string; minutes: number } | null>((acc, bucket) => {
    if (!acc || bucket.minutes > acc.minutes) return bucket;
    return acc;
  }, null)?.hourLabel ?? null;

  const streakDays = computeStreak(daily);

  const mostActiveDay = longestDay?.label ?? null;

  const previousActiveDays = computeDailyTotals(previousSessions).length;
  const comparisonMinutesDelta = previousMinutes === 0 ? 100 : ((totalMinutes - previousMinutes) / previousMinutes) * 100;
  const comparisonSessionsDelta = previousSessions.length === 0 ? 100 : ((sessions.length - previousSessions.length) / previousSessions.length) * 100;
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
