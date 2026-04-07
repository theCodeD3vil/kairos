import {
  GetCalendarDayData,
  GetCalendarMonthData,
  GetOverviewData,
  GetSessionsPageData,
  GetSettingsData,
  GetVSCodeBridgeHealth,
  ListKnownMachines,
  ListSessionsForRange,
} from '../../../wailsjs/go/main/App';
import type { contracts } from '../../../wailsjs/go/models';
import { overviewChartPalette, syncUptimeColors } from '@/components/overview/chart-colors';
import type { OverviewRange, OverviewSnapshot } from '@/components/overview/types';
import type {
  AnalyticsFilters,
  AnalyticsSnapshot,
  BreakdownItem,
  DailyStat,
  MachineBreakdown,
  SessionRecord,
} from '@/data/mockAnalytics';
import type { CalendarDay, CalendarDayDetail } from '@/data/mockCalendar';
import type { DateRange } from '@/components/ruixen/range-calendar';
import type { AppStatus, MachineInfo } from '@/mocks/system-info';
import { trackSyncOperation } from '@/lib/sync-status';

type LoadSnapshotOptions = {
  quiet?: boolean;
};

type DisplayPreferences = {
  hour12: boolean;
  weekStartsOn: 'monday' | 'sunday';
  showMachineNames: boolean;
  showHostname: boolean;
  obfuscateProjectNames: boolean;
  minimizeExtensionMetadata: boolean;
  trackMachineAttribution: boolean;
  sendMachineAttribution: boolean;
};

const REDACTED_MACHINE_LABEL = 'redacted-machine';

function normalizeLanguageLabel(language: string): string {
  return language === 'TypeScriptReact' ? 'React' : language;
}

const syncColorByStatus = {
  Healthy: syncUptimeColors.high,
  Degraded: syncUptimeColors.medium,
  Offline: syncUptimeColors.critical,
} as const;
const syncHistoryWindowMinutes = 90;
const syncHistoryBucketMinutes = 10;
const extensionPingIntervalMs = 60_000;

export type SessionsScreenData = {
  range: OverviewRange;
  totalSessions: number;
  averageSessionMinutes: number;
  longestSessionMinutes: number;
  lastActiveAt: string;
  lastActiveMachine: string;
  currentMachine: MachineInfo;
  knownMachines: MachineInfo[];
  sessions: Array<{
    id: string;
    project: string;
    language: string;
    durationMinutes: number;
    startAt: string;
    machineName: string;
    osLabel: string;
  }>;
};

type SessionRecordInternal = SessionRecord & {
  machineId: string;
  dateKey: string;
  endTime: string;
  dayLabel: string;
};

type DateWindow = {
  rangeLabel: string;
  startDate: string;
  endDate: string;
  start: Date;
  end: Date;
};

function formatDateTime(value?: string, hour12?: boolean) {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12,
  });
}

function formatDate(value?: string) {
  if (!value) {
    return '—';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(value?: string, hour12?: boolean) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12,
  });
}

function formatOsLabel(machine: { osPlatform?: string; os?: string }) {
  const platform = machine.osPlatform ?? machine.os;
  switch (platform) {
    case 'darwin':
      return 'macOS';
    case 'windows':
      return 'Windows';
    case 'linux':
      return 'Linux';
    default:
      return platform || 'Unknown OS';
  }
}

function startOfDayUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function toUTCDate(date: Date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function addDays(date: Date, delta: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + delta);
  return next;
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfWeekUTC(date: Date, weekStartsOn: DisplayPreferences['weekStartsOn'] = 'monday') {
  const current = startOfDayUTC(date);
  const weekday = current.getUTCDay();
  const offset = weekStartsOn === 'sunday' ? weekday : (weekday === 0 ? 6 : weekday - 1);
  return addDays(current, -offset);
}

function endOfMonthUTC(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}

function resolveDateWindow(
  range: OverviewRange,
  customRange: DateRange | null,
  weekStartsOn: DisplayPreferences['weekStartsOn'] = 'monday',
  reference: Date = new Date(),
): DateWindow {
  const today = startOfDayUTC(reference);

  if (range === 'custom' && customRange) {
    const start = toUTCDate(customRange.start);
    const end = toUTCDate(customRange.end);
    return {
      rangeLabel: `${formatDateKey(start)}..${formatDateKey(end)}`,
      startDate: formatDateKey(start),
      endDate: formatDateKey(end),
      start,
      end,
    };
  }

  if (range === 'today') {
    const day = formatDateKey(today);
    return {
      rangeLabel: `${day}..${day}`,
      startDate: day,
      endDate: day,
      start: today,
      end: today,
    };
  }

  if (range === 'month') {
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
    const end = endOfMonthUTC(today);
    const startDate = formatDateKey(start);
    const endDate = formatDateKey(end);
    return {
      rangeLabel: `${startDate}..${endDate}`,
      startDate,
      endDate,
      start,
      end,
    };
  }

  const start = startOfWeekUTC(today, weekStartsOn);
  const end = addDays(start, 6);
  const startDate = formatDateKey(start);
  const endDate = formatDateKey(end);
  return {
    rangeLabel: `${startDate}..${endDate}`,
    startDate,
    endDate,
    start,
    end,
  };
}

function previousWindow(window: DateWindow): DateWindow {
  const dayCount = Math.max(
    1,
    Math.round((window.end.getTime() - window.start.getTime()) / (24 * 60 * 60 * 1000)) + 1,
  );
  const end = addDays(window.start, -1);
  const start = addDays(end, -(dayCount - 1));
  return {
    rangeLabel: `${formatDateKey(start)}..${formatDateKey(end)}`,
    startDate: formatDateKey(start),
    endDate: formatDateKey(end),
    start,
    end,
  };
}

function buildTrend(points: DailyStat[] | Array<{ label: string; minutes: number }>) {
  return points.map((point) => ({
    label: point.label,
    value: Number((point.minutes / 60).toFixed(2)),
  }));
}

function buildHourlyTrendForDay(
  sessions: contracts.Session[],
  dayStart: Date,
  hour12: boolean,
): Array<{ label: string; value: number }> {
  const totals = Array.from({ length: 24 }, () => 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  for (const session of sessions) {
    const sessionStart = new Date(session.startTime);
    if (Number.isNaN(sessionStart.getTime()) || session.durationMinutes <= 0) {
      continue;
    }

    let current = sessionStart;
    let remaining = session.durationMinutes;

    while (remaining > 0) {
      const hourBoundary = new Date(Date.UTC(
        current.getUTCFullYear(),
        current.getUTCMonth(),
        current.getUTCDate(),
        current.getUTCHours() + 1,
        0,
        0,
        0,
      ));
      const minutesUntilBoundary = Math.max(
        1,
        Math.ceil((hourBoundary.getTime() - current.getTime()) / 60_000),
      );
      const allocated = Math.min(remaining, minutesUntilBoundary);
      const currentMs = current.getTime();
      if (currentMs >= dayStart.getTime() && currentMs < dayEnd.getTime()) {
        const hourIndex = current.getUTCHours();
        totals[hourIndex] += allocated;
      }

      remaining -= allocated;
      current = new Date(current.getTime() + allocated * 60_000);
      if (current.getTime() >= dayEnd.getTime() && remaining <= 0) {
        break;
      }
    }
  }

  return Array.from({ length: 24 }, (_, hour) => {
    const labelDate = new Date(Date.UTC(
      dayStart.getUTCFullYear(),
      dayStart.getUTCMonth(),
      dayStart.getUTCDate(),
      hour,
      0,
      0,
      0,
    ));
    const label = hour % 2 === 0
      ? labelDate.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12,
        timeZone: 'UTC',
      })
      // Keep category keys unique while visually hiding odd-hour ticks.
      : '\u200B'.repeat(hour + 1);
    return {
      label,
      value: Number((totals[hour] / 60).toFixed(2)),
    };
  });
}

function buildSyncHealth(
  status: contracts.SettingsData['extensionStatus'],
  lastUpdatedAt: string,
  bridgeReachable: boolean,
  preferences: DisplayPreferences,
): OverviewSnapshot['syncHealth'] {
  const now = new Date();
  const healthyWindowMs = extensionPingIntervalMs;
  const degradedWindowMs = extensionPingIntervalMs * 2;

  const timestamps = [status.lastEventAt, status.lastHandshakeAt]
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => right.getTime() - left.getTime());

  const lastSeen = timestamps[0] ?? null;

  const resolveStatusAt = (at: Date): OverviewSnapshot['syncHealth']['status'] => {
    if (!status.installed || !lastSeen) {
      return 'Offline';
    }

    const gap = at.getTime() - lastSeen.getTime();
    if (gap <= healthyWindowMs) {
      return 'Healthy';
    }
    if (gap <= degradedWindowMs) {
      return 'Degraded';
    }
    return 'Offline';
  };

  const nowStatus = status.connected ? resolveStatusAt(now) : 'Offline';

  return {
    status: nowStatus,
    bridgeReachable,
    lastSyncAt: formatDateTime(status.lastHandshakeAt ?? lastUpdatedAt, preferences.hour12),
    blocks: Array.from({ length: syncHistoryWindowMinutes / syncHistoryBucketMinutes }, (_, index) => {
      const bucketOffset = syncHistoryWindowMinutes - (index + 1) * syncHistoryBucketMinutes;
      const bucketStart = new Date(now.getTime() - bucketOffset * 60_000);
      const bucketEnd = new Date(bucketStart.getTime() + syncHistoryBucketMinutes * 60_000);
      const slotStatus = resolveStatusAt(bucketEnd);
      const startLabel = bucketStart.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: preferences.hour12,
      });
      const endLabel = bucketEnd.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: preferences.hour12,
      });
      return {
        key: `sync-${bucketStart.toISOString()}`,
        color: syncColorByStatus[slotStatus],
        tooltip: `${startLabel} - ${endLabel} · ${slotStatus}`,
      };
    }),
  };
}

function adaptMachine(
  system: contracts.SettingsData['system'],
  extensionStatus: contracts.SettingsData['extensionStatus'],
  preferences: DisplayPreferences,
): MachineInfo {
  const machineName = resolveDisplayMachineName(system.machineName, system.machineId, preferences);
  return {
    machineName,
    machineId: system.machineId,
    hostname: preferences.showHostname ? (system.hostname ?? '') : '',
    os: formatOsLabel(system),
    osVersion: system.osVersion ?? '',
    architecture: system.arch ?? '',
    editorName: system.editor === 'vscode' ? 'VS Code' : system.editor,
    editorVersion: preferences.minimizeExtensionMetadata ? '' : (system.editorVersion ?? ''),
    extensionVersion: preferences.minimizeExtensionMetadata ? '' : (extensionStatus.extensionVersion ?? system.extensionVersion ?? ''),
    lastSeenAt: formatDateTime(system.lastSeenAt, preferences.hour12),
  };
}

function adaptKnownMachine(
  machine: contracts.MachineInfo,
  extensionStatus: contracts.SettingsData['extensionStatus'],
  preferences: DisplayPreferences,
): MachineInfo {
  const machineName = resolveDisplayMachineName(machine.machineName, machine.machineId, preferences);
  return {
    machineName,
    machineId: machine.machineId,
    hostname: preferences.showHostname ? (machine.hostname ?? '') : '',
    os: formatOsLabel(machine),
    osVersion: machine.osVersion ?? '',
    architecture: machine.arch ?? '',
    editorName: 'VS Code',
    editorVersion: '',
    extensionVersion: preferences.minimizeExtensionMetadata ? '' : (extensionStatus.extensionVersion ?? ''),
    lastSeenAt: 'Recently seen',
  };
}

function getDisplayPreferences(settings: contracts.SettingsData): DisplayPreferences {
  return {
    hour12: settings.general.timeFormat !== '24h',
    weekStartsOn: settings.general.weekStartsOn === 'sunday' ? 'sunday' : 'monday',
    showMachineNames: settings.privacy.showMachineNames,
    showHostname: settings.privacy.showHostname,
    obfuscateProjectNames: settings.privacy.obfuscateProjectNames,
    minimizeExtensionMetadata: settings.privacy.minimizeExtensionMetadata,
    trackMachineAttribution: settings.tracking.trackMachineAttribution,
    sendMachineAttribution: settings.extension.sendMachineAttribution,
  };
}

function resolveDisplayMachineName(
  source: string | undefined,
  machineId: string,
  preferences: DisplayPreferences,
) {
  const canShowMachineNames = preferences.showMachineNames
    && preferences.trackMachineAttribution
    && preferences.sendMachineAttribution;
  if (!canShowMachineNames) {
    return REDACTED_MACHINE_LABEL;
  }
  return source ?? machineId;
}

function createProjectLabelMapper(obfuscate: boolean, sensitiveProjectNames: string[]) {
  const labels = new Map<string, string>();
  const sensitiveSet = new Set(
    sensitiveProjectNames
      .map((name) => name.trim().toLowerCase())
      .filter((name) => name.length > 0),
  );

  return (value: string) => {
    const normalized = value.trim().toLowerCase();
    const shouldObfuscate = obfuscate && normalized !== '' && sensitiveSet.has(normalized);
    if (!shouldObfuscate) {
      return value;
    }

    const existing = labels.get(value);
    if (existing) {
      return existing;
    }
    const mapped = `Project ${labels.size + 1}`;
    labels.set(value, mapped);
    return mapped;
  };
}

function buildAppStatus(settings: contracts.SettingsData, lastUpdatedAt: string): AppStatus {
  const preferences = getDisplayPreferences(settings);
  return {
    appVersion: settings.about.appVersion,
    trackingEnabled: settings.tracking.trackingEnabled,
    localOnlyMode: settings.privacy.localOnlyMode,
    lastUpdatedAt: formatDateTime(lastUpdatedAt, preferences.hour12),
  };
}

function machineIndex(machines: contracts.MachineInfo[]) {
  return new Map(machines.map((machine) => [machine.machineId, machine]));
}

function mapSessionRecord(
  session: contracts.Session,
  machines: Map<string, contracts.MachineInfo>,
  preferences: DisplayPreferences,
  mapProjectLabel: (value: string) => string,
): SessionRecordInternal {
  const machine = machines.get(session.machineId);
  const machineName = resolveDisplayMachineName(session.machineName ?? machine?.machineName, session.machineId, preferences);

  return {
    id: session.id,
    project: mapProjectLabel(session.projectName),
    language: normalizeLanguageLabel(session.language),
    machine: machineName,
    machineId: session.machineId,
    start: session.startTime,
    durationMinutes: session.durationMinutes,
    dateKey: session.date,
    dayLabel: formatDate(session.startTime),
    endTime: session.endTime,
  };
}

function filterSessionRecords(records: SessionRecordInternal[], filters: AnalyticsFilters) {
  return records.filter((record) => {
    if (filters.project !== 'all' && record.project !== filters.project) {
      return false;
    }
    if (filters.language !== 'all' && record.language !== filters.language) {
      return false;
    }
    if (filters.machine !== 'all' && record.machine !== filters.machine) {
      return false;
    }
    return true;
  });
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function computeDailyTotals(records: SessionRecordInternal[]): DailyStat[] {
  const totals = new Map<string, number>();
  for (const record of records) {
    totals.set(record.dateKey, (totals.get(record.dateKey) ?? 0) + record.durationMinutes);
  }

  return [...totals.entries()]
    .map(([date, minutes]) => ({
      date,
      label: formatDate(date),
      minutes,
    }))
    .sort((left, right) => left.date.localeCompare(right.date));
}

function computeWeeklyTotals(daily: DailyStat[], weekStartsOn: DisplayPreferences['weekStartsOn']) {
  const totals = new Map<string, number>();
  for (const day of daily) {
    const current = startOfWeekUTC(new Date(day.date), weekStartsOn);
    const key = formatDateKey(current);
    totals.set(key, (totals.get(key) ?? 0) + day.minutes);
  }

  return [...totals.entries()]
    .map(([weekStart, minutes]) => ({
      label: formatDate(weekStart),
      minutes,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

function computeBreakdown(
  records: SessionRecordInternal[],
  field: 'project' | 'language' | 'machine',
  hour12: boolean,
): BreakdownItem[] {
  const totalMinutes = records.reduce((sum, record) => sum + record.durationMinutes, 0);
  const aggregates = new Map<string, { minutes: number; activeDays: Set<string>; lastActiveAt: string }>();

  for (const record of records) {
    const key = record[field];
    const aggregate = aggregates.get(key) ?? {
      minutes: 0,
      activeDays: new Set<string>(),
      lastActiveAt: record.endTime,
    };
    aggregate.minutes += record.durationMinutes;
    aggregate.activeDays.add(record.dateKey);
    if (record.endTime > aggregate.lastActiveAt) {
      aggregate.lastActiveAt = record.endTime;
    }
    aggregates.set(key, aggregate);
  }

  return [...aggregates.entries()]
    .map(([name, value]) => ({
      name,
      minutes: value.minutes,
      share: totalMinutes === 0 ? 0 : Number(((value.minutes / totalMinutes) * 100).toFixed(1)),
      activeDays: value.activeDays.size,
      recent: formatDateTime(value.lastActiveAt, hour12),
    }))
    .sort((left, right) => {
      if (right.minutes !== left.minutes) {
        return right.minutes - left.minutes;
      }
      return left.name.localeCompare(right.name);
    });
}

function computeMachineBreakdown(records: SessionRecordInternal[], hour12: boolean): MachineBreakdown[] {
  return computeBreakdown(records, 'machine', hour12).map((item) => ({
    name: item.name,
    minutes: item.minutes,
    share: item.share,
    lastActiveAt: item.recent,
  }));
}

function computeHourBuckets(records: SessionRecordInternal[]) {
  const buckets = new Map<number, number>();
  for (const record of records) {
    const hour = new Date(record.start).getHours();
    buckets.set(hour, (buckets.get(hour) ?? 0) + record.durationMinutes);
  }

  return [...buckets.entries()]
    .map(([hour, minutes]) => ({
      hourLabel: `${hour.toString().padStart(2, '0')}:00`,
      minutes,
    }))
    .sort((left, right) => left.hourLabel.localeCompare(right.hourLabel));
}

function computeStreak(daily: DailyStat[]) {
  if (daily.length === 0) {
    return 0;
  }

  const dates = daily.map((day) => startOfDayUTC(new Date(day.date)).getTime()).sort((left, right) => right - left);
  let streak = 1;
  for (let index = 1; index < dates.length; index += 1) {
    const difference = (dates[index - 1] - dates[index]) / (24 * 60 * 60 * 1000);
    if (difference === 1) {
      streak += 1;
      continue;
    }
    break;
  }
  return streak;
}

function computeDelta(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return Math.round((((current - previous) / previous) * 100) * 10) / 10;
}

function buildEmptyMachineInfo(): MachineInfo {
  return {
    machineName: 'Unknown machine',
    machineId: 'unknown-machine',
    hostname: '',
    os: 'Unknown OS',
    osVersion: '',
    architecture: '',
    editorName: 'VS Code',
    editorVersion: '',
    extensionVersion: '',
    lastSeenAt: '—',
  };
}

function buildEmptyAppStatus(): AppStatus {
  return {
    appVersion: '0.0.0',
    trackingEnabled: true,
    localOnlyMode: true,
    lastUpdatedAt: '—',
  };
}

export function emptyOverviewSnapshot(range: OverviewRange): OverviewSnapshot {
  return {
    range,
    todayMinutes: 0,
    weekMinutes: 0,
    sessionCount: 0,
    averageSessionMinutes: 0,
    codingDaysThisWeek: 0,
    lastActiveAt: '—',
    trackingEnabled: true,
    localOnlyMode: true,
    lastUpdatedAt: '—',
    currentMachine: buildEmptyMachineInfo(),
    knownMachines: [],
    appStatus: buildEmptyAppStatus(),
    lastActiveMachine: 'No activity yet',
    weeklyTrend: [],
    topProjects: [],
    topLanguages: [],
    machineDistribution: [],
    recentSessions: [],
    activeHoursSummary: 'No activity processed yet',
    syncHealth: {
      status: 'Offline',
      bridgeReachable: false,
      lastSyncAt: '—',
      blocks: [],
    },
  };
}

export function emptyAnalyticsSnapshot(filters: AnalyticsFilters): AnalyticsSnapshot {
  return {
    summary: {
      totalMinutes: 0,
      activeDays: 0,
      sessions: 0,
      averageSessionMinutes: 0,
      comparison: {
        previousMinutes: 0,
        previousSessions: 0,
        previousActiveDays: 0,
      },
    },
    time: {
      daily: [],
      weekly: [],
      longestDay: null,
      averagePerActiveDay: 0,
    },
    projects: {
      items: [],
      topProject: null,
    },
    languages: {
      items: [],
      topLanguage: null,
    },
    sessions: {
      recent: [],
      longestSession: 0,
      averageSessionMinutes: 0,
      totalSessions: 0,
    },
    machines: {
      items: [],
      lastActiveMachine: null,
    },
    patterns: {
      mostActiveDay: null,
      mostActiveHour: null,
      streakDays: 0,
      hourBuckets: [],
    },
    comparison: {
      minutesDeltaPct: 0,
      sessionsDeltaPct: 0,
      activeDaysDeltaPct: 0,
      topProjectChange: { current: null, previous: null },
      topLanguageChange: { current: null, previous: null },
    },
    filters: {
      projects: [],
      languages: [],
      machines: [],
    },
  };
}

export function emptySessionsScreenData(range: OverviewRange): SessionsScreenData {
  return {
    range,
    totalSessions: 0,
    averageSessionMinutes: 0,
    longestSessionMinutes: 0,
    lastActiveAt: '—',
    lastActiveMachine: 'No activity yet',
    currentMachine: buildEmptyMachineInfo(),
    knownMachines: [],
    sessions: [],
  };
}

async function fetchAnalyticsSnapshot(
  filters: AnalyticsFilters,
  settingsInput?: contracts.SettingsData,
): Promise<AnalyticsSnapshot> {
  const settings = settingsInput ?? await GetSettingsData();
  const preferences = getDisplayPreferences(settings);
  const mapProjectLabel = createProjectLabelMapper(
    preferences.obfuscateProjectNames,
    settings.privacy.sensitiveProjectNames ?? [],
  );
  const window = resolveDateWindow(filters.range, filters.customRange ?? null, preferences.weekStartsOn);
  const previous = previousWindow(window);

  const [currentSessions, previousSessions, machines] = await Promise.all([
    ListSessionsForRange(window.startDate, window.endDate),
    ListSessionsForRange(previous.startDate, previous.endDate),
    ListKnownMachines(),
  ]);

  const machinesById = machineIndex(machines);
  const allCurrentRecords = currentSessions.map((session) => mapSessionRecord(session, machinesById, preferences, mapProjectLabel));
  const filteredCurrentRecords = filterSessionRecords(allCurrentRecords, filters);
  const filteredPreviousRecords = filterSessionRecords(
    previousSessions.map((session) => mapSessionRecord(session, machinesById, preferences, mapProjectLabel)),
    filters,
  );

  const totalMinutes = filteredCurrentRecords.reduce((sum, record) => sum + record.durationMinutes, 0);
  const previousMinutes = filteredPreviousRecords.reduce((sum, record) => sum + record.durationMinutes, 0);
  const daily = computeDailyTotals(filteredCurrentRecords);
  const weekly = computeWeeklyTotals(daily, preferences.weekStartsOn);
  const breakdownProjects = computeBreakdown(filteredCurrentRecords, 'project', preferences.hour12);
  const breakdownLanguages = computeBreakdown(filteredCurrentRecords, 'language', preferences.hour12);
  const breakdownMachines = computeMachineBreakdown(filteredCurrentRecords, preferences.hour12);
  const previousProjects = computeBreakdown(filteredPreviousRecords, 'project', preferences.hour12);
  const previousLanguages = computeBreakdown(filteredPreviousRecords, 'language', preferences.hour12);
  const hourBuckets = computeHourBuckets(filteredCurrentRecords);
  const recentSessions = [...filteredCurrentRecords]
    .sort((left, right) => right.start.localeCompare(left.start))
    .slice(0, 8);

  const longestDay = daily.reduce<DailyStat | null>((accumulator, day) => {
    if (!accumulator || day.minutes > accumulator.minutes) {
      return day;
    }
    return accumulator;
  }, null);

  const longestSession = filteredCurrentRecords.reduce(
    (maximum, session) => Math.max(maximum, session.durationMinutes),
    0,
  );
  const averageSessionMinutes = filteredCurrentRecords.length === 0
    ? 0
    : Math.round(totalMinutes / filteredCurrentRecords.length);
  const previousDaily = computeDailyTotals(filteredPreviousRecords);

  return {
    summary: {
      totalMinutes,
      activeDays: daily.length,
      sessions: filteredCurrentRecords.length,
      averageSessionMinutes,
      comparison: {
        previousMinutes,
        previousSessions: filteredPreviousRecords.length,
        previousActiveDays: previousDaily.length,
      },
    },
    time: {
      daily,
      weekly,
      longestDay,
      averagePerActiveDay: daily.length === 0 ? 0 : Math.round(totalMinutes / daily.length),
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
      recent: recentSessions.map((session) => ({
        id: session.id,
        project: session.project,
        language: session.language,
        machine: session.machine,
        start: session.start,
        durationMinutes: session.durationMinutes,
        dayLabel: session.dayLabel,
      })),
      longestSession,
      averageSessionMinutes,
      totalSessions: filteredCurrentRecords.length,
    },
    machines: {
      items: breakdownMachines,
      lastActiveMachine: breakdownMachines[0]?.name ?? null,
    },
    patterns: {
      mostActiveDay: longestDay?.label ?? null,
      mostActiveHour: hourBuckets.reduce<{ hourLabel: string; minutes: number } | null>((accumulator, bucket) => {
        if (!accumulator || bucket.minutes > accumulator.minutes) {
          return bucket;
        }
        return accumulator;
      }, null)?.hourLabel ?? null,
      streakDays: computeStreak(daily),
      hourBuckets,
    },
    comparison: {
      minutesDeltaPct: computeDelta(totalMinutes, previousMinutes),
      sessionsDeltaPct: computeDelta(filteredCurrentRecords.length, filteredPreviousRecords.length),
      activeDaysDeltaPct: computeDelta(daily.length, previousDaily.length),
      topProjectChange: {
        current: breakdownProjects[0]?.name ?? null,
        previous: previousProjects[0]?.name ?? null,
      },
      topLanguageChange: {
        current: breakdownLanguages[0]?.name ?? null,
        previous: previousLanguages[0]?.name ?? null,
      },
    },
    filters: {
      projects: unique(allCurrentRecords.map((record) => record.project)).sort(),
      languages: unique(allCurrentRecords.map((record) => record.language)).sort(),
      machines: unique(allCurrentRecords.map((record) => record.machine)).sort(),
    },
  };
}

export async function loadAnalyticsSnapshot(
  filters: AnalyticsFilters,
  options: LoadSnapshotOptions = {},
): Promise<AnalyticsSnapshot> {
  const operation = () => fetchAnalyticsSnapshot(filters);
  if (options.quiet !== false) {
    return operation();
  }

  return trackSyncOperation(operation, {
    inProgressMessage: 'Syncing analytics',
    successMessage: 'Analytics synced',
    errorMessage: 'Analytics sync failed',
  });
}

export async function loadOverviewSnapshot(
  range: OverviewRange,
  customRange: DateRange | null,
  options: LoadSnapshotOptions = {},
): Promise<OverviewSnapshot> {
  const operation = async () => {
    const settings = await GetSettingsData();
    const preferences = getDisplayPreferences(settings);
    const mapProjectLabel = createProjectLabelMapper(
      preferences.obfuscateProjectNames,
      settings.privacy.sensitiveProjectNames ?? [],
    );
    const rangeWindow = resolveDateWindow(range, customRange, preferences.weekStartsOn);
    const analytics = await fetchAnalyticsSnapshot({
      range,
      customRange,
      project: 'all',
      language: 'all',
      machine: 'all',
    }, settings);

    const [overview, machines, bridgeReachable, dailySessions] = await Promise.all([
      GetOverviewData(),
      ListKnownMachines(),
      GetVSCodeBridgeHealth().catch(() => false),
      range === 'today'
        ? ListSessionsForRange(rangeWindow.startDate, rangeWindow.endDate)
        : Promise.resolve([] as contracts.Session[]),
    ]);

    const currentMachine = adaptMachine(settings.system, settings.extensionStatus, preferences);
    const knownMachines = machines.map((machine) => adaptKnownMachine(machine, settings.extensionStatus, preferences));
    const machineDistribution = analytics.machines.items.map((machine, index) => ({
      machineName: machine.name,
      minutes: machine.minutes,
      share: Math.round(machine.share),
      color: overviewChartPalette[index % overviewChartPalette.length],
    }));
    const trend = range === 'today'
      ? buildHourlyTrendForDay(dailySessions, rangeWindow.start, preferences.hour12)
      : range === 'month'
        ? buildTrend(analytics.time.weekly)
        : buildTrend(analytics.time.daily);

    return {
      range,
      todayMinutes: overview.todayMinutes,
      weekMinutes: overview.weekMinutes,
      sessionCount: analytics.summary.sessions,
      averageSessionMinutes: analytics.summary.averageSessionMinutes,
      codingDaysThisWeek: analytics.summary.activeDays,
      lastActiveAt: overview.lastActiveAt ? formatDateTime(overview.lastActiveAt, preferences.hour12) : '—',
      trackingEnabled: overview.trackingEnabled,
      localOnlyMode: overview.localOnlyMode,
      lastUpdatedAt: formatDateTime(overview.lastUpdatedAt, preferences.hour12),
      currentMachine,
      knownMachines,
      appStatus: buildAppStatus(settings, overview.lastUpdatedAt),
      lastActiveMachine: analytics.machines.lastActiveMachine ?? currentMachine.machineName,
      weeklyTrend: trend,
      topProjects: analytics.projects.items.slice(0, 5).map((project, index) => ({
        project: mapProjectLabel(project.name),
        minutes: project.minutes,
        recentActivityAt: project.recent,
        color: overviewChartPalette[index % overviewChartPalette.length],
      })),
      topLanguages: analytics.languages.items.slice(0, 5).map((language) => ({
        language: language.name,
        minutes: language.minutes,
        share: Math.round(language.share),
      })),
      machineDistribution,
      recentSessions: analytics.sessions.recent.map((session) => ({
        project: session.project,
        durationMinutes: session.durationMinutes,
        startAt: formatDateTime(session.start, preferences.hour12),
        machineName: session.machine,
        osLabel: formatOsLabel(
          machines.find((machine) => machine.machineName === session.machine) ?? { osPlatform: 'linux' },
        ),
      })),
      activeHoursSummary: overview.activeHoursSummary,
      syncHealth: buildSyncHealth(
        settings.extensionStatus,
        overview.lastUpdatedAt,
        bridgeReachable,
        preferences,
      ),
    };
  };

  if (options.quiet !== false) {
    return operation();
  }

  return trackSyncOperation(operation, {
    inProgressMessage: 'Syncing overview',
    successMessage: 'Overview synced',
    errorMessage: 'Overview sync failed',
  });
}

export async function loadSessionsScreenData(
  range: OverviewRange,
  customRange: DateRange | null,
  options: LoadSnapshotOptions = {},
): Promise<SessionsScreenData> {
  const operation = async () => {
    const settings = await GetSettingsData();
    const preferences = getDisplayPreferences(settings);
    const rangeWindow = resolveDateWindow(range, customRange, preferences.weekStartsOn);
    const [data, machines] = await Promise.all([
      GetSessionsPageData(rangeWindow.rangeLabel),
      ListKnownMachines(),
    ]);

    const currentMachine = adaptMachine(settings.system, settings.extensionStatus, preferences);
    const knownMachines = machines.map((machine) => adaptKnownMachine(machine, settings.extensionStatus, preferences));
    const machinesById = machineIndex(machines);
    const mapProjectLabel = createProjectLabelMapper(
      preferences.obfuscateProjectNames,
      settings.privacy.sensitiveProjectNames ?? [],
    );
    const sessions = data.sessions.map((session) => {
      const machine = machinesById.get(session.machineId);
      const machineName = resolveDisplayMachineName(session.machineName ?? machine?.machineName, session.machineId, preferences);
      return {
        id: session.id,
        project: mapProjectLabel(session.projectName),
        language: normalizeLanguageLabel(session.language),
        durationMinutes: session.durationMinutes,
        startAt: formatDateTime(session.startTime, preferences.hour12),
        machineName,
        osLabel: formatOsLabel(machine ?? { osPlatform: 'linux' }),
      };
    });

    return {
      range,
      totalSessions: data.totalSessions,
      averageSessionMinutes: data.averageSessionMinutes,
      longestSessionMinutes: data.longestSessionMinutes,
      lastActiveAt: formatDateTime(data.sessions[0]?.endTime ?? data.sessions[0]?.startTime, preferences.hour12),
      lastActiveMachine: sessions[0]?.machineName ?? currentMachine.machineName,
      currentMachine,
      knownMachines,
      sessions,
    };
  };

  if (options.quiet !== false) {
    return operation();
  }

  return trackSyncOperation(operation, {
    inProgressMessage: 'Syncing sessions',
    successMessage: 'Sessions synced',
    errorMessage: 'Sessions sync failed',
  });
}

export async function loadCalendarMonth(
  year: number,
  month: number,
  options: LoadSnapshotOptions = {},
): Promise<{ monthLabel: string; days: CalendarDay[] }> {
  const operation = async () => {
    const settings = await GetSettingsData();
    const preferences = getDisplayPreferences(settings);
    const mapProjectLabel = createProjectLabelMapper(
      preferences.obfuscateProjectNames,
      settings.privacy.sensitiveProjectNames ?? [],
    );
    const monthLabel = `${year}-${String(month + 1).padStart(2, '0')}`;
    const data = await GetCalendarMonthData(monthLabel);

    return {
      monthLabel: data.monthLabel,
      days: data.days.map((day) => ({
        date: day.date,
        totalMinutes: day.totalMinutes,
        sessionCount: day.sessionCount,
        topProject: day.topProject ? mapProjectLabel(day.topProject) : null,
        topLanguage: day.topLanguage ? normalizeLanguageLabel(day.topLanguage) : null,
        machineCount: day.machineCount,
        hadActivity: day.hadActivity,
      })),
    };
  };

  if (options.quiet !== false) {
    return operation();
  }

  return trackSyncOperation(operation, {
    inProgressMessage: 'Syncing calendar month',
    successMessage: 'Calendar synced',
    errorMessage: 'Calendar sync failed',
  });
}

export async function loadCalendarDay(
  date: string,
  options: LoadSnapshotOptions = {},
): Promise<CalendarDayDetail | null> {
  const operation = async () => {
    const settings = await GetSettingsData();
    const preferences = getDisplayPreferences(settings);
    const mapProjectLabel = createProjectLabelMapper(
      preferences.obfuscateProjectNames,
      settings.privacy.sensitiveProjectNames ?? [],
    );
    const data = await GetCalendarDayData(date);
    if (!data.hadActivity) {
      return null;
    }

    return {
      date: data.date,
      totalMinutes: data.totalMinutes,
      sessionCount: data.sessionCount,
      averageSessionMinutes: data.averageSessionMinutes,
      firstActiveAt: formatTime(data.firstActiveAt, preferences.hour12),
      lastActiveAt: formatTime(data.lastActiveAt, preferences.hour12),
      topProject: data.topProject ? mapProjectLabel(data.topProject) : null,
      topLanguage: data.topLanguage ? normalizeLanguageLabel(data.topLanguage) : null,
      machines: data.machineBreakdown.map((machine) => ({
        name: resolveDisplayMachineName(machine.machineName, machine.machineId, preferences),
        os: formatOsLabel({ osPlatform: machine.osPlatform ?? '' }),
        minutes: machine.totalMinutes,
      })),
      sessions: data.sessions.map((session) => ({
        id: session.id,
        start: formatTime(session.startTime, preferences.hour12) ?? session.startTime,
        durationMinutes: session.durationMinutes,
        project: mapProjectLabel(session.projectName),
        machine: resolveDisplayMachineName(session.machineName, session.machineId, preferences),
        language: normalizeLanguageLabel(session.language),
      })),
      projectBreakdown: data.projectBreakdown.map((project) => ({
        project: mapProjectLabel(project.projectName),
        minutes: project.totalMinutes,
        sessionCount: project.sessionCount,
      })),
    };
  };

  if (options.quiet !== false) {
    return operation();
  }

  return trackSyncOperation(operation, {
    inProgressMessage: 'Syncing calendar day',
    successMessage: 'Day details synced',
    errorMessage: 'Day sync failed',
  });
}
