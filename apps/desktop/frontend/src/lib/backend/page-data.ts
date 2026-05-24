import {
  GetAnalyticsData,
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
import type {
  OverviewRange,
  OverviewSnapshot,
  TodayTrendInterval,
} from '@/components/overview/types';
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
const NO_WORKSPACE_SENTINEL = 'no-workspace';
const LEGACY_WORKSPACE_SENTINEL = 'untitled-workspace';
const NO_WORKSPACE_DISPLAY_LABEL = 'No workspace';

function normalizeLanguageLabel(language: string): string {
  const trimmed = language.trim();
  if (!trimmed) {
    return language;
  }

  const compact = trimmed.toLowerCase().replace(/[\s_-]+/g, '');
  if (compact === 'typescriptreact') {
    return 'React';
  }

  return trimmed;
}

function normalizeProjectDisplayLabel(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === NO_WORKSPACE_SENTINEL || normalized === LEGACY_WORKSPACE_SENTINEL) {
    return NO_WORKSPACE_DISPLAY_LABEL;
  }
  return value;
}

const syncColorByStatus = {
  Healthy: syncUptimeColors.high,
  Degraded: syncUptimeColors.medium,
  Offline: syncUptimeColors.critical,
} as const;
const syncHistoryWindowMinutes = 90;
const syncHistoryBucketMinutes = 10;
const extensionPingIntervalMs = 60_000;
const defaultDeepWorkThresholdMinutes = 60;
const shortSessionThresholdMinutes = 15;

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
    rangeStartAt: string;
    rangeEndAt: string;
    machineName: string;
    osLabel: string;
    sessionCount: number;
    machineCount: number;
    subSessions: Array<{
      id: string;
      language: string;
      durationMinutes: number;
      startAt: string;
      endAt: string;
      machineName: string;
      osLabel: string;
    }>;
  }>;
};

type SessionRecordInternal = SessionRecord & {
  machineId: string;
  dateKey: string;
  endTime: string;
  dayLabel: string;
  osLabel: string;
};

type AnalyticsSourceData = {
  shouldCompare: boolean;
  allCurrentRecords: SessionRecordInternal[];
  allPreviousRecords: SessionRecordInternal[];
  filters: AnalyticsSnapshot['filters'];
};

type DateWindow = {
  rangeLabel: string;
  startDate: string;
  endDate: string;
  start: Date;
  end: Date;
};

const analyticsSourceCache = new Map<string, Promise<AnalyticsSourceData>>();

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
  const offset = weekStartsOn === 'sunday' ? weekday : weekday === 0 ? 6 : weekday - 1;
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

  if (range === 'all-time') {
    return {
      rangeLabel: 'all-time',
      startDate: '0000-00-00',
      endDate: '9999-99-99',
      start: new Date(Date.UTC(0, 0, 1)),
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

  if (range === 'last-90-days') {
    const end = today;
    const start = addDays(end, -89);
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

function buildDayTrendForInterval(
  sessions: contracts.Session[],
  dayStart: Date,
  hour12: boolean,
  intervalMinutes: number,
): Array<{ label: string; value: number }> {
  const totalBuckets = Math.floor((24 * 60) / intervalMinutes);
  const totals = Array.from({ length: totalBuckets }, () => 0);
  const intervalMs = intervalMinutes * 60_000;
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();

  for (const session of sessions) {
    const sessionStart = new Date(session.startTime);
    if (Number.isNaN(sessionStart.getTime()) || session.durationMinutes <= 0) {
      continue;
    }

    let current = sessionStart;
    let remaining = session.durationMinutes;

    while (remaining > 0) {
      const currentMs = current.getTime();
      const bucketIndex = Math.floor((currentMs - dayStartMs) / intervalMs);
      const bucketBoundaryMs = dayStartMs + (bucketIndex + 1) * intervalMs;
      const minutesUntilBoundary = Math.max(1, Math.ceil((bucketBoundaryMs - currentMs) / 60_000));
      const allocated = Math.min(remaining, minutesUntilBoundary);
      if (
        currentMs >= dayStartMs &&
        currentMs < dayEndMs &&
        bucketIndex >= 0 &&
        bucketIndex < totals.length
      ) {
        totals[bucketIndex] += allocated;
      }

      remaining -= allocated;
      current = new Date(current.getTime() + allocated * 60_000);
      if (current.getTime() >= dayEndMs && remaining <= 0) {
        break;
      }
    }
  }

  return Array.from({ length: totalBuckets }, (_, index) => {
    const minuteOffset = index * intervalMinutes;
    const labelDate = new Date(
      Date.UTC(
        dayStart.getUTCFullYear(),
        dayStart.getUTCMonth(),
        dayStart.getUTCDate(),
        Math.floor(minuteOffset / 60),
        minuteOffset % 60,
        0,
        0,
      ),
    );
    const label = labelDate.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12,
      timeZone: 'UTC',
    });
    return {
      label,
      value: Number((totals[index] / 60).toFixed(2)),
    };
  });
}

function buildTodayTrendByInterval(
  sessions: contracts.Session[],
  dayStart: Date,
  hour12: boolean,
): Record<TodayTrendInterval, Array<{ label: string; value: number }>> {
  return {
    '5m': buildDayTrendForInterval(sessions, dayStart, hour12, 5),
    '30m': buildDayTrendForInterval(sessions, dayStart, hour12, 30),
    '1h': buildDayTrendForInterval(sessions, dayStart, hour12, 60),
    '2h': buildDayTrendForInterval(sessions, dayStart, hour12, 120),
    '6h': buildDayTrendForInterval(sessions, dayStart, hour12, 360),
  };
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
    blocks: Array.from(
      { length: syncHistoryWindowMinutes / syncHistoryBucketMinutes },
      (_, index) => {
        const windowStart = new Date(now.getTime() - syncHistoryWindowMinutes * 60_000);
        const bucketStart = new Date(
          windowStart.getTime() + index * syncHistoryBucketMinutes * 60_000,
        );
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
      },
    ),
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
    extensionVersion: preferences.minimizeExtensionMetadata
      ? ''
      : (extensionStatus.extensionVersion ?? system.extensionVersion ?? ''),
    lastSeenAt: formatDateTime(system.lastSeenAt, preferences.hour12),
  };
}

function adaptKnownMachine(
  machine: contracts.MachineInfo,
  extensionStatus: contracts.SettingsData['extensionStatus'],
  preferences: DisplayPreferences,
): MachineInfo {
  const machineName = resolveDisplayMachineName(
    machine.machineName,
    machine.machineId,
    preferences,
  );
  return {
    machineName,
    machineId: machine.machineId,
    hostname: preferences.showHostname ? (machine.hostname ?? '') : '',
    os: formatOsLabel(machine),
    osVersion: machine.osVersion ?? '',
    architecture: machine.arch ?? '',
    editorName: 'VS Code',
    editorVersion: '',
    extensionVersion: preferences.minimizeExtensionMetadata
      ? ''
      : (extensionStatus.extensionVersion ?? ''),
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
  const canShowMachineNames =
    preferences.showMachineNames &&
    preferences.trackMachineAttribution &&
    preferences.sendMachineAttribution;
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
    const displayLabel = normalizeProjectDisplayLabel(value);
    const normalized = value.trim().toLowerCase();
    const shouldObfuscate = obfuscate && normalized !== '' && sensitiveSet.has(normalized);
    if (!shouldObfuscate) {
      return displayLabel;
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
  const machineName = resolveDisplayMachineName(
    session.machineName ?? machine?.machineName,
    session.machineId,
    preferences,
  );

  return {
    id: session.id,
    project: mapProjectLabel(session.projectName),
    language: normalizeLanguageLabel(session.language),
    machine: machineName,
    osLabel: formatOsLabel(machine ?? { osPlatform: 'linux' }),
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
    .sort(([leftWeekStart], [rightWeekStart]) => leftWeekStart.localeCompare(rightWeekStart))
    .map(([weekStart, minutes]) => ({
      label: formatDate(weekStart),
      minutes,
    }));
}

function computeBreakdown(
  records: SessionRecordInternal[],
  field: 'project' | 'language' | 'machine',
  hour12: boolean,
): BreakdownItem[] {
  const totalMinutes = records.reduce((sum, record) => sum + record.durationMinutes, 0);
  const aggregates = new Map<
    string,
    { minutes: number; activeDays: Set<string>; lastActiveAt: string }
  >();

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

function computeMachineBreakdown(
  records: SessionRecordInternal[],
  hour12: boolean,
): MachineBreakdown[] {
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

function formatClockMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function roundOneDecimal(value: number) {
  return Math.round(value * 10) / 10;
}

function percentOfTotal(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }
  return roundOneDecimal((value / total) * 100);
}

function dateKeysBetween(start: Date, end: Date) {
  const dates: string[] = [];
  for (
    let current = startOfDayUTC(start);
    current.getTime() <= startOfDayUTC(end).getTime();
    current = addDays(current, 1)
  ) {
    dates.push(formatDateKey(current));
  }
  return dates;
}

function currentStreakDays(activeDates: Set<string>, dateWindow: DateWindow) {
  let streak = 0;
  for (
    let current = startOfDayUTC(dateWindow.end);
    current.getTime() >= startOfDayUTC(dateWindow.start).getTime();
    current = addDays(current, -1)
  ) {
    if (!activeDates.has(formatDateKey(current))) {
      return streak;
    }
    streak += 1;
  }
  return streak;
}

function longestStreakDays(activeDates: Set<string>, dateWindow: DateWindow) {
  let longest = 0;
  let currentStreak = 0;
  for (const dateKey of dateKeysBetween(dateWindow.start, dateWindow.end)) {
    if (activeDates.has(dateKey)) {
      currentStreak += 1;
      longest = Math.max(longest, currentStreak);
      continue;
    }
    currentStreak = 0;
  }
  return longest;
}

function rollingAverageMinutes(
  dailyTotals: Map<string, number>,
  dateWindow: DateWindow,
  days: number,
) {
  const end = startOfDayUTC(dateWindow.end);
  const requestedStart = addDays(end, -(days - 1));
  const start =
    requestedStart.getTime() < startOfDayUTC(dateWindow.start).getTime()
      ? startOfDayUTC(dateWindow.start)
      : requestedStart;
  const keys = dateKeysBetween(start, end);
  if (keys.length === 0) {
    return 0;
  }
  const total = keys.reduce((sum, key) => sum + (dailyTotals.get(key) ?? 0), 0);
  return Math.round(total / keys.length);
}

function emptyTimeKpiPoint() {
  return { label: '', date: '', totalMinutes: 0 };
}

function bestTimeKpiPoint(totals: Map<string, number>) {
  let best = emptyTimeKpiPoint();
  for (const [date, totalMinutes] of totals.entries()) {
    if (totalMinutes <= 0) {
      continue;
    }
    if (
      totalMinutes > best.totalMinutes ||
      (totalMinutes === best.totalMinutes && (!best.date || date < best.date))
    ) {
      best = {
        label: date.length === 10 ? formatDate(date) : date,
        date,
        totalMinutes,
      };
    }
  }
  return best;
}

function computeDurationKpis(records: SessionRecordInternal[]) {
  const durations = records
    .map((record) => record.durationMinutes)
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
  const p90Index = Math.min(
    durations.length - 1,
    Math.max(0, Math.ceil(durations.length * 0.9) - 1),
  );

  return {
    averageMinutes: Math.round(
      durations.reduce((sum, duration) => sum + duration, 0) / durations.length,
    ),
    medianMinutes,
    p90Minutes: durations[p90Index],
    longestMinutes: durations[durations.length - 1],
  };
}

function computeBreakKpis(records: SessionRecordInternal[]) {
  const ordered = [...records].sort((left, right) => {
    if (left.start !== right.start) {
      return left.start.localeCompare(right.start);
    }
    return left.id.localeCompare(right.id);
  });
  const gaps: number[] = [];
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (previous.dateKey !== current.dateKey) {
      continue;
    }
    const previousEnd = new Date(previous.endTime);
    const currentStart = new Date(current.start);
    if (Number.isNaN(previousEnd.getTime()) || Number.isNaN(currentStart.getTime())) {
      continue;
    }
    const gapMinutes = Math.ceil((currentStart.getTime() - previousEnd.getTime()) / 60_000);
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

function computeActivityBounds(records: SessionRecordInternal[]) {
  let firstActiveAt = '';
  let lastActiveAt = '';
  let earliestMinute = 0;
  let latestMinute = 0;
  let hasClock = false;

  for (const record of records) {
    const start = new Date(record.start);
    const end = new Date(record.endTime);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      continue;
    }
    if (!firstActiveAt || record.start < firstActiveAt) {
      firstActiveAt = record.start;
    }
    if (!lastActiveAt || record.endTime > lastActiveAt) {
      lastActiveAt = record.endTime;
    }
    const startMinute = start.getUTCHours() * 60 + start.getUTCMinutes();
    const endMinute = end.getUTCHours() * 60 + end.getUTCMinutes();
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

function computeWeekdayHeatmap(records: SessionRecordInternal[]) {
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const totals = Array.from({ length: labels.length }, () => 0);
  for (const record of records) {
    const parsed = new Date(`${record.dateKey}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) {
      continue;
    }
    const index = (parsed.getUTCDay() + 6) % 7;
    totals[index] += record.durationMinutes;
  }
  return labels.map((label, index) => ({
    index,
    label,
    totalMinutes: totals[index],
  }));
}

function computeHourlyHeatmap(records: SessionRecordInternal[]) {
  const totals = Array.from({ length: 24 }, () => 0);
  for (const record of records) {
    const start = new Date(record.start);
    if (Number.isNaN(start.getTime())) {
      continue;
    }
    let current = new Date(start);
    let remaining = record.durationMinutes;
    while (remaining > 0) {
      const nextHour = new Date(
        Date.UTC(
          current.getUTCFullYear(),
          current.getUTCMonth(),
          current.getUTCDate(),
          current.getUTCHours() + 1,
          0,
          0,
          0,
        ),
      );
      const minutesUntilHour = Math.max(
        1,
        Math.ceil((nextHour.getTime() - current.getTime()) / 60_000),
      );
      const allocated = Math.min(remaining, minutesUntilHour);
      totals[current.getUTCHours()] += allocated;
      remaining -= allocated;
      current = new Date(current.getTime() + allocated * 60_000);
    }
  }
  return totals.map((totalMinutes, index) => ({
    index,
    label: `${String(index).padStart(2, '0')}:00`,
    totalMinutes,
  }));
}

function computeSessionKpis(
  records: SessionRecordInternal[],
  dateWindow: DateWindow,
  previousMinutes: number,
  deepWorkThresholdMinutes: number = defaultDeepWorkThresholdMinutes,
): AnalyticsSnapshot['sessionKpis'] {
  const resolvedDeepWorkThresholdMinutes =
    deepWorkThresholdMinutes > 0 ? deepWorkThresholdMinutes : defaultDeepWorkThresholdMinutes;
  const daily = computeDailyTotals(records);
  const dailyTotals = new Map(daily.map((day) => [day.date, day.minutes]));
  const activeDates = new Set(daily.map((day) => day.date));
  const totalMinutes = records.reduce((sum, record) => sum + record.durationMinutes, 0);
  const weekTotals = new Map<string, number>();
  const monthTotals = new Map<string, number>();
  let deepWorkMinutes = 0;
  let deepWorkBlockCount = 0;
  let shortSessionCount = 0;

  for (const record of records) {
    const weekStart = formatDateKey(
      startOfWeekUTC(new Date(`${record.dateKey}T00:00:00Z`), 'monday'),
    );
    weekTotals.set(weekStart, (weekTotals.get(weekStart) ?? 0) + record.durationMinutes);
    const month = record.dateKey.slice(0, 7);
    monthTotals.set(month, (monthTotals.get(month) ?? 0) + record.durationMinutes);
    if (record.durationMinutes >= resolvedDeepWorkThresholdMinutes) {
      deepWorkMinutes += record.durationMinutes;
      deepWorkBlockCount += 1;
    }
    if (record.durationMinutes > 0 && record.durationMinutes < shortSessionThresholdMinutes) {
      shortSessionCount += 1;
    }
  }

  const breakKpis = computeBreakKpis(records);
  const activityBounds = computeActivityBounds(records);
  const calendarDayCount = dateKeysBetween(dateWindow.start, dateWindow.end).length;

  return {
    activeDays: activeDates.size,
    currentStreakDays: currentStreakDays(activeDates, dateWindow),
    longestStreakDays: longestStreakDays(activeDates, dateWindow),
    rolling7DayAverageMinutes: rollingAverageMinutes(dailyTotals, dateWindow, 7),
    rolling30DayAverageMinutes: rollingAverageMinutes(dailyTotals, dateWindow, 30),
    previousPeriodDeltaPercent: computeDelta(totalMinutes, previousMinutes),
    bestDay: bestTimeKpiPoint(dailyTotals),
    bestWeek: bestTimeKpiPoint(weekTotals),
    bestMonth: bestTimeKpiPoint(monthTotals),
    duration: computeDurationKpis(records),
    deepWorkThresholdMinutes: resolvedDeepWorkThresholdMinutes,
    deepWorkMinutes,
    deepWorkBlockCount,
    shortSessionThresholdMinutes,
    shortSessionCount,
    fragmentationScore: percentOfTotal(shortSessionCount, records.length),
    longestBreakMinutes: breakKpis.longestBreakMinutes,
    medianBreakMinutes: breakKpis.medianBreakMinutes,
    firstActiveAt: activityBounds.firstActiveAt,
    lastActiveAt: activityBounds.lastActiveAt,
    focusWindowStart: activityBounds.focusWindowStart,
    focusWindowEnd: activityBounds.focusWindowEnd,
    weekdayHeatmap: computeWeekdayHeatmap(records),
    hourlyHeatmap: computeHourlyHeatmap(records),
    consistencyScore: percentOfTotal(activeDates.size, calendarDayCount),
  };
}

function contextSwitchCount(records: SessionRecordInternal[], field: 'project' | 'language') {
  const ordered = [...records].sort((left, right) => {
    if (left.start !== right.start) {
      return left.start.localeCompare(right.start);
    }
    return left.id.localeCompare(right.id);
  });
  let switches = 0;
  let previous = '';
  for (const record of ordered) {
    const current = record[field].trim();
    if (!current) {
      continue;
    }
    if (previous && previous !== current) {
      switches += 1;
    }
    previous = current;
  }
  return switches;
}

function ratePerDay(count: number, dayCount: number) {
  if (count <= 0 || dayCount <= 0) {
    return 0;
  }
  return roundOneDecimal(count / dayCount);
}

function breakdownLeader(
  item: BreakdownItem | undefined,
  records: SessionRecordInternal[],
  field: 'project' | 'language',
) {
  if (!item) {
    return emptyContextLeader();
  }
  const sessionCount = records.filter((record) => record[field] === item.name).length;
  return {
    name: item.name,
    totalMinutes: item.minutes,
    sessionCount,
    activeDays: item.activeDays,
    shareOfTotal: item.share,
  };
}

function topByActiveDays(items: BreakdownItem[]) {
  return [...items].sort((left, right) => {
    if (right.activeDays !== left.activeDays) {
      return right.activeDays - left.activeDays;
    }
    if (right.minutes !== left.minutes) {
      return right.minutes - left.minutes;
    }
    return left.name.localeCompare(right.name);
  })[0];
}

function computeContextMomentum(
  records: SessionRecordInternal[],
  dateWindow: DateWindow,
  field: 'project' | 'language',
) {
  const currentStart = addDays(startOfDayUTC(dateWindow.end), -6);
  const previousEnd = addDays(currentStart, -1);
  const previousStart = addDays(previousEnd, -6);
  const currentTotals = new Map<string, number>();
  const previousTotals = new Map<string, number>();

  for (const record of records) {
    const name = record[field].trim();
    if (!name) {
      continue;
    }
    const day = startOfDayUTC(new Date(`${record.dateKey}T00:00:00Z`));
    if (
      day.getTime() >= currentStart.getTime() &&
      day.getTime() <= startOfDayUTC(dateWindow.end).getTime()
    ) {
      currentTotals.set(name, (currentTotals.get(name) ?? 0) + record.durationMinutes);
      continue;
    }
    if (day.getTime() >= previousStart.getTime() && day.getTime() <= previousEnd.getTime()) {
      previousTotals.set(name, (previousTotals.get(name) ?? 0) + record.durationMinutes);
    }
  }

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
      if (right.previousMinutes !== left.previousMinutes) {
        return right.previousMinutes - left.previousMinutes;
      }
      return left.name.localeCompare(right.name);
    })
    .slice(0, 5);
}

function crossMachineResumeCount(records: SessionRecordInternal[]) {
  const ordered = [...records].sort((left, right) => {
    if (left.start !== right.start) {
      return left.start.localeCompare(right.start);
    }
    return left.id.localeCompare(right.id);
  });
  let count = 0;
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (previous.project !== current.project || previous.machineId === current.machineId) {
      continue;
    }
    const previousEnd = new Date(previous.endTime);
    const currentStart = new Date(current.start);
    if (Number.isNaN(previousEnd.getTime()) || Number.isNaN(currentStart.getTime())) {
      continue;
    }
    const gap = currentStart.getTime() - previousEnd.getTime();
    if (gap >= 0 && gap <= 24 * 60 * 60 * 1000) {
      count += 1;
    }
  }
  return count;
}

function computeContextKpis(
  records: SessionRecordInternal[],
  dateWindow: DateWindow,
  projectBreakdown: BreakdownItem[],
  languageBreakdown: BreakdownItem[],
  machineBreakdown: MachineBreakdown[],
): AnalyticsSnapshot['contextKpis'] {
  const activeDays = computeDailyTotals(records).length;
  const projectSwitchCount = contextSwitchCount(records, 'project');
  const languageSwitchCount = contextSwitchCount(records, 'language');
  const machineResumeCount = crossMachineResumeCount(records);

  return {
    projectSwitchCount,
    projectSwitchRatePerDay: ratePerDay(projectSwitchCount, activeDays),
    languageSwitchCount,
    languageSwitchRatePerDay: ratePerDay(languageSwitchCount, activeDays),
    branchSwitchCount: 0,
    branchSwitchRatePerDay: 0,
    projectFocusScore: projectBreakdown[0]?.share ?? 0,
    languageFocusScore: languageBreakdown[0]?.share ?? 0,
    topProjectByTime: breakdownLeader(projectBreakdown[0], records, 'project'),
    topProjectBySessions: breakdownLeader(
      [...projectBreakdown].sort((left, right) => {
        const leftCount = records.filter((record) => record.project === left.name).length;
        const rightCount = records.filter((record) => record.project === right.name).length;
        if (rightCount !== leftCount) {
          return rightCount - leftCount;
        }
        return right.minutes - left.minutes;
      })[0],
      records,
      'project',
    ),
    topProjectByActiveDays: breakdownLeader(topByActiveDays(projectBreakdown), records, 'project'),
    topLanguageByTime: breakdownLeader(languageBreakdown[0], records, 'language'),
    topLanguageBySessions: breakdownLeader(
      [...languageBreakdown].sort((left, right) => {
        const leftCount = records.filter((record) => record.language === left.name).length;
        const rightCount = records.filter((record) => record.language === right.name).length;
        if (rightCount !== leftCount) {
          return rightCount - leftCount;
        }
        return right.minutes - left.minutes;
      })[0],
      records,
      'language',
    ),
    topLanguageByActiveDays: breakdownLeader(
      topByActiveDays(languageBreakdown),
      records,
      'language',
    ),
    projectMomentum: computeContextMomentum(records, dateWindow, 'project'),
    languageMomentum: computeContextMomentum(records, dateWindow, 'language'),
    machineTimeSplit: machineBreakdown.map((item) => ({
      machineId: item.name,
      machineName: item.name,
      totalMinutes: item.minutes,
      shareOfTotal: item.share,
    })),
    crossMachineResumeCount: machineResumeCount,
    crossMachineResumeRate:
      records.length < 2 ? 0 : percentOfTotal(machineResumeCount, records.length - 1),
    workspaceContinuity: [],
    branchTime: [],
    projectBranchBreakdown: [],
  };
}

function computeStreak(daily: DailyStat[]) {
  if (daily.length === 0) {
    return 0;
  }

  const dates = daily
    .map((day) => startOfDayUTC(new Date(day.date)).getTime())
    .sort((left, right) => right - left);
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
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

type SessionGroupAccumulator = {
  dateKey: string;
  project: string;
  durationMinutes: number;
  latestStartTime: string;
  earliestStartTime: string;
  latestEndTime: string;
  latestMachineName: string;
  latestOsLabel: string;
  sessionCount: number;
  languages: Set<string>;
  machineIds: Set<string>;
  osLabels: Set<string>;
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

type GroupedSessionRecord = {
  id: string;
  project: string;
  language: string;
  machine: string;
  osLabel: string;
  start: string;
  groupStart: string;
  groupEnd: string;
  dayLabel: string;
  durationMinutes: number;
  sessionCount: number;
  machineCount: number;
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

function summarizeLanguages(languages: Set<string>) {
  const values = [...languages].filter(Boolean);
  if (values.length === 0) {
    return 'Unknown';
  }
  if (values.length === 1) {
    return values[0];
  }
  return `Mixed (${values.length})`;
}

function groupSessionRecordsByProjectAndDay(
  records: SessionRecordInternal[],
): GroupedSessionRecord[] {
  const grouped = new Map<string, SessionGroupAccumulator>();

  for (const record of records) {
    const dateKey = record.dateKey || record.start.slice(0, 10);
    const project = record.project;
    const language = record.language;
    const groupKey = `${dateKey}\u0000${project}`;
    const existing = grouped.get(groupKey);

    if (!existing) {
      grouped.set(groupKey, {
        dateKey,
        project,
        durationMinutes: record.durationMinutes,
        latestStartTime: record.start,
        earliestStartTime: record.start,
        latestEndTime: record.endTime,
        latestMachineName: record.machine,
        latestOsLabel: record.osLabel,
        sessionCount: 1,
        languages: new Set([language]),
        machineIds: new Set([record.machineId]),
        osLabels: new Set([record.osLabel]),
        subSessions: [
          {
            id: record.id,
            language: record.language,
            durationMinutes: record.durationMinutes,
            start: record.start,
            end: record.endTime,
            machine: record.machine,
            osLabel: record.osLabel,
          },
        ],
      });
      continue;
    }

    existing.durationMinutes += record.durationMinutes;
    existing.sessionCount += 1;
    existing.languages.add(language);
    existing.machineIds.add(record.machineId);
    existing.osLabels.add(record.osLabel);
    existing.subSessions.push({
      id: record.id,
      language: record.language,
      durationMinutes: record.durationMinutes,
      start: record.start,
      end: record.endTime,
      machine: record.machine,
      osLabel: record.osLabel,
    });

    if (record.start > existing.latestStartTime) {
      existing.latestStartTime = record.start;
      existing.latestMachineName = record.machine;
      existing.latestOsLabel = record.osLabel;
    }
    if (record.start < existing.earliestStartTime) {
      existing.earliestStartTime = record.start;
    }
    if (record.endTime > existing.latestEndTime) {
      existing.latestEndTime = record.endTime;
    }
  }

  return [...grouped.values()]
    .sort((left, right) => {
      if (left.latestEndTime !== right.latestEndTime) {
        return right.latestEndTime.localeCompare(left.latestEndTime);
      }
      if (left.latestStartTime !== right.latestStartTime) {
        return right.latestStartTime.localeCompare(left.latestStartTime);
      }
      return left.project.localeCompare(right.project);
    })
    .map((group) => {
      const machineCount = group.machineIds.size;
      return {
        id: `${group.dateKey}:${group.project}`,
        project: group.project,
        language: summarizeLanguages(group.languages),
        machine: machineCount > 1 ? `${machineCount} machines` : group.latestMachineName,
        osLabel: group.osLabels.size > 1 ? 'Mixed OS' : group.latestOsLabel,
        start: group.latestStartTime,
        groupStart: group.earliestStartTime,
        groupEnd: group.latestEndTime,
        dayLabel: formatDate(group.dateKey),
        durationMinutes: group.durationMinutes,
        sessionCount: group.sessionCount,
        machineCount,
        subSessions: [...group.subSessions].sort((left, right) =>
          right.start.localeCompare(left.start),
        ),
      };
    });
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

function emptySessionKpis(): AnalyticsSnapshot['sessionKpis'] {
  return {
    activeDays: 0,
    currentStreakDays: 0,
    longestStreakDays: 0,
    rolling7DayAverageMinutes: 0,
    rolling30DayAverageMinutes: 0,
    previousPeriodDeltaPercent: 0,
    bestDay: emptyTimeKpiPoint(),
    bestWeek: emptyTimeKpiPoint(),
    bestMonth: emptyTimeKpiPoint(),
    duration: {
      averageMinutes: 0,
      medianMinutes: 0,
      p90Minutes: 0,
      longestMinutes: 0,
    },
    deepWorkThresholdMinutes: defaultDeepWorkThresholdMinutes,
    deepWorkMinutes: 0,
    deepWorkBlockCount: 0,
    shortSessionThresholdMinutes,
    shortSessionCount: 0,
    fragmentationScore: 0,
    longestBreakMinutes: 0,
    medianBreakMinutes: 0,
    weekdayHeatmap: computeWeekdayHeatmap([]),
    hourlyHeatmap: computeHourlyHeatmap([]),
    consistencyScore: 0,
  };
}

function emptyContextLeader() {
  return { name: '', totalMinutes: 0, sessionCount: 0, activeDays: 0, shareOfTotal: 0 };
}

function emptyFileKpis(): AnalyticsSnapshot['fileKpis'] {
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

function emptyInsightScore(direction: AnalyticsSnapshot['insightScores']['momentumScore']['direction'] = 'higher-is-better'): AnalyticsSnapshot['insightScores']['momentumScore'] {
  return {
    score: 0,
    direction,
    inputs: [],
  };
}

function emptyInsightScores(): AnalyticsSnapshot['insightScores'] {
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

function emptyEventActivityKpis(): AnalyticsSnapshot['eventKpis'] {
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

function emptyContextKpis(): AnalyticsSnapshot['contextKpis'] {
  return {
    projectSwitchCount: 0,
    projectSwitchRatePerDay: 0,
    languageSwitchCount: 0,
    languageSwitchRatePerDay: 0,
    branchSwitchCount: 0,
    branchSwitchRatePerDay: 0,
    projectFocusScore: 0,
    languageFocusScore: 0,
    topProjectByTime: emptyContextLeader(),
    topProjectBySessions: emptyContextLeader(),
    topProjectByActiveDays: emptyContextLeader(),
    topLanguageByTime: emptyContextLeader(),
    topLanguageBySessions: emptyContextLeader(),
    topLanguageByActiveDays: emptyContextLeader(),
    projectMomentum: [],
    languageMomentum: [],
    machineTimeSplit: [],
    crossMachineResumeCount: 0,
    crossMachineResumeRate: 0,
    workspaceContinuity: [],
    branchTime: [],
    projectBranchBreakdown: [],
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
    sessionKpis: emptySessionKpis(),
    contextKpis: emptyContextKpis(),
    eventKpis: emptyEventActivityKpis(),
    fileKpis: emptyFileKpis(),
    insightScores: emptyInsightScores(),
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

function analyticsSourceCacheKey(
  window: DateWindow,
  shouldCompare: boolean,
  settings: contracts.SettingsData,
  preferences: DisplayPreferences,
) {
  return [
    window.rangeLabel,
    shouldCompare ? 'compare' : 'no-compare',
    settings.dataStorage?.lastProcessedAt ?? '',
    settings.extensionStatus?.lastEventAt ?? '',
    preferences.hour12 ? '12h' : '24h',
    preferences.weekStartsOn,
    preferences.showMachineNames ? 'machines' : 'machines-hidden',
    preferences.showHostname ? 'hostnames' : 'hostnames-hidden',
    preferences.obfuscateProjectNames ? 'projects-obfuscated' : 'projects-plain',
    settings.privacy.sensitiveProjectNames?.join('\u0000') ?? '',
  ].join('\u0001');
}

type BackendAnalyticsExtras = {
  eventKpis: AnalyticsSnapshot['eventKpis'];
  fileKpis: AnalyticsSnapshot['fileKpis'];
  insightScores: AnalyticsSnapshot['insightScores'];
};

async function fetchBackendAnalyticsExtras(rangeLabel: string): Promise<BackendAnalyticsExtras> {
  try {
    const data = await GetAnalyticsData(rangeLabel);
    return {
      eventKpis: mapEventKpis(data?.eventKpis),
      fileKpis: mapFileKpis(data?.fileKpis),
      insightScores: mapInsightScores(data?.insightScores),
    };
  } catch (error) {
    console.warn('failed to load backend analytics extras', error);
    return {
      eventKpis: emptyEventActivityKpis(),
      fileKpis: emptyFileKpis(),
      insightScores: emptyInsightScores(),
    };
  }
}

function mapInsightScore(raw: contracts.InsightScore | undefined | null, direction: AnalyticsSnapshot['insightScores']['momentumScore']['direction'] = 'higher-is-better'): AnalyticsSnapshot['insightScores']['momentumScore'] {
  if (!raw) {
    return emptyInsightScore(direction);
  }
  return {
    score: raw.score ?? 0,
    direction: (raw.direction as AnalyticsSnapshot['insightScores']['momentumScore']['direction']) ?? direction,
    inputs: (raw.inputs ?? []).map((input) => ({
      label: input.label,
      value: input.value ?? 0,
      score: input.score ?? 0,
      weight: input.weight ?? 0,
    })),
  };
}

function mapInsightScores(raw: contracts.InsightScoreSummary | undefined | null): AnalyticsSnapshot['insightScores'] {
  if (!raw) {
    return emptyInsightScores();
  }
  return {
    momentumScore: mapInsightScore(raw.momentumScore),
    focusScore: mapInsightScore(raw.focusScore),
    consistencyScore: mapInsightScore(raw.consistencyScore),
    fragmentationScore: mapInsightScore(raw.fragmentationScore, 'lower-is-better'),
    recoveryScore: mapInsightScore(raw.recoveryScore),
    trackingHealthScore: mapInsightScore(raw.trackingHealthScore),
    projectInvestmentScore: mapInsightScore(raw.projectInvestmentScore),
    projectInvestmentBreakdown: (raw.projectInvestmentBreakdown ?? []).map((project) => ({
      projectName: project.projectName,
      score: project.score ?? 0,
      totalMinutes: project.totalMinutes ?? 0,
      activeDays: project.activeDays ?? 0,
      momentumPercent: project.momentumPercent ?? 0,
      shareOfTotal: project.shareOfTotal ?? 0,
    })),
  };
}

function mapEventKpis(raw: contracts.EventActivityKpiSummary | undefined | null): AnalyticsSnapshot['eventKpis'] {
  if (!raw) {
    return emptyEventActivityKpis();
  }
  return {
    totalEvents: raw.totalEvents ?? 0,
    eventsInSessions: raw.eventsInSessions ?? 0,
    editCount: raw.editCount ?? 0,
    saveCount: raw.saveCount ?? 0,
    openCount: raw.openCount ?? 0,
    heartbeatCount: raw.heartbeatCount ?? 0,
    focusCount: raw.focusCount ?? 0,
    blurCount: raw.blurCount ?? 0,
    activeEventCount: raw.activeEventCount ?? 0,
    passiveEventCount: raw.passiveEventCount ?? 0,
    neutralEventCount: raw.neutralEventCount ?? 0,
    activeShare: raw.activeShare ?? 0,
    passiveShare: raw.passiveShare ?? 0,
    neutralShare: raw.neutralShare ?? 0,
    eventDensityPerMinute: raw.eventDensityPerMinute ?? 0,
    editSaveRatio: raw.editSaveRatio ?? 0,
    medianFirstOpenToFirstEditSeconds: raw.medianFirstOpenToFirstEditSeconds ?? 0,
    medianEditToSaveSeconds: raw.medianEditToSaveSeconds ?? 0,
    medianSessionWarmupSeconds: raw.medianSessionWarmupSeconds ?? 0,
    warmupQualifyingSessionCount: raw.warmupQualifyingSessionCount ?? 0,
    medianReturnAfterIdleMinutes: raw.medianReturnAfterIdleMinutes ?? 0,
    activityBurstCount: raw.activityBurstCount ?? 0,
    heartbeatOnlySessionCount: raw.heartbeatOnlySessionCount ?? 0,
    heartbeatOnlySessionShare: raw.heartbeatOnlySessionShare ?? 0,
    trackEditEvents: Boolean(raw.trackEditEvents),
    trackSaveEvents: Boolean(raw.trackSaveEvents),
    trackFileOpenEvents: Boolean(raw.trackFileOpenEvents),
    eventTypeMixByProject: (raw.eventTypeMixByProject ?? []).map((bucket) => ({ ...bucket })),
    eventTypeMixByLanguage: (raw.eventTypeMixByLanguage ?? []).map((bucket) => ({ ...bucket })),
    eventTypeMixByMachine: (raw.eventTypeMixByMachine ?? []).map((bucket) => ({ ...bucket })),
  };
}

function mapFileKpis(raw: contracts.FileKpiSummary | undefined | null): AnalyticsSnapshot['fileKpis'] {
  if (!raw) {
    return emptyFileKpis();
  }
  const cloneHotspot = (hotspot: contracts.FileHotspot) => ({
    filePath: hotspot.filePath,
    fileName: hotspot.fileName,
    category: hotspot.category as AnalyticsSnapshot['fileKpis']['topFiles'][number]['category'],
    totalMinutes: hotspot.totalMinutes ?? 0,
    eventCount: hotspot.eventCount ?? 0,
    editCount: hotspot.editCount ?? 0,
    saveCount: hotspot.saveCount ?? 0,
    shareOfTotal: hotspot.shareOfTotal ?? 0,
    lastActiveAt: hotspot.lastActiveAt,
  });
  return {
    optInEnabled: Boolean(raw.optInEnabled),
    filePathsAvailable: Boolean(raw.filePathsAvailable),
    pathsMasked: Boolean(raw.pathsMasked),
    uniqueFileCount: raw.uniqueFileCount ?? 0,
    averageUniqueFilesPerSession: raw.averageUniqueFilesPerSession ?? 0,
    totalAttributedMinutes: raw.totalAttributedMinutes ?? 0,
    topFiles: (raw.topFiles ?? []).map(cloneHotspot),
    mostRevisitedFiles: (raw.mostRevisitedFiles ?? []).map(cloneHotspot),
    categoryBreakdown: (raw.categoryBreakdown ?? []).map((entry) => ({
      category: entry.category as AnalyticsSnapshot['fileKpis']['categoryBreakdown'][number]['category'],
      totalMinutes: entry.totalMinutes ?? 0,
      eventCount: entry.eventCount ?? 0,
      fileCount: entry.fileCount ?? 0,
      shareOfTotal: entry.shareOfTotal ?? 0,
    })),
    testVsSource: {
      testMinutes: raw.testVsSource?.testMinutes ?? 0,
      sourceMinutes: raw.testVsSource?.sourceMinutes ?? 0,
      testShareOfCode: raw.testVsSource?.testShareOfCode ?? 0,
    },
    documentationMinutes: raw.documentationMinutes ?? 0,
    configMinutes: raw.configMinutes ?? 0,
    infrastructureMinutes: raw.infrastructureMinutes ?? 0,
    fileChurnLeaders: (raw.fileChurnLeaders ?? []).map(cloneHotspot),
    longRunningFocusBlocks: (raw.longRunningFocusBlocks ?? []).map((block) => ({
      filePath: block.filePath,
      fileName: block.fileName,
      startTime: block.startTime,
      endTime: block.endTime,
      durationMinutes: block.durationMinutes ?? 0,
      eventCount: block.eventCount ?? 0,
    })),
    projectAreaBreakdown: (raw.projectAreaBreakdown ?? []).map((entry) => ({
      projectName: entry.projectName,
      area: entry.area,
      totalMinutes: entry.totalMinutes ?? 0,
      eventCount: entry.eventCount ?? 0,
      shareOfTotal: entry.shareOfTotal ?? 0,
    })),
  };
}

function loadAnalyticsSource(
  filters: AnalyticsFilters,
  settings: contracts.SettingsData,
  preferences: DisplayPreferences,
  mapProjectLabel: (projectName: string) => string,
): Promise<AnalyticsSourceData> {
  const window = resolveDateWindow(
    filters.range,
    filters.customRange ?? null,
    preferences.weekStartsOn,
  );
  const shouldCompare = filters.range !== 'all-time';
  const cacheKey = analyticsSourceCacheKey(window, shouldCompare, settings, preferences);
  const shouldUseCache = Boolean(settings.dataStorage);
  if (shouldUseCache) {
    const cached = analyticsSourceCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const promise = (async () => {
    const previous = shouldCompare ? previousWindow(window) : null;
    const [currentSessions, previousSessions, machines] = await Promise.all([
      ListSessionsForRange(window.startDate, window.endDate),
      previous
        ? ListSessionsForRange(previous.startDate, previous.endDate)
        : Promise.resolve([] as contracts.Session[]),
      ListKnownMachines(),
    ]);

    const machinesById = machineIndex(machines);
    const allCurrentRecords = currentSessions.map((session) =>
      mapSessionRecord(session, machinesById, preferences, mapProjectLabel),
    );
    const allPreviousRecords = previousSessions.map((session) =>
      mapSessionRecord(session, machinesById, preferences, mapProjectLabel),
    );

    return {
      shouldCompare,
      allCurrentRecords,
      allPreviousRecords,
      filters: {
        projects: unique(allCurrentRecords.map((record) => record.project)).sort(),
        languages: unique(allCurrentRecords.map((record) => record.language)).sort(),
        machines: unique(allCurrentRecords.map((record) => record.machine)).sort(),
      },
    };
  })().catch((error: unknown) => {
    if (shouldUseCache) {
      analyticsSourceCache.delete(cacheKey);
    }
    throw error;
  });

  if (shouldUseCache) {
    analyticsSourceCache.set(cacheKey, promise);
  }
  return promise;
}

async function fetchAnalyticsSnapshot(
  filters: AnalyticsFilters,
  settingsInput?: contracts.SettingsData,
): Promise<AnalyticsSnapshot> {
  const settings = settingsInput ?? (await GetSettingsData());
  const preferences = getDisplayPreferences(settings);
  const mapProjectLabel = createProjectLabelMapper(
    preferences.obfuscateProjectNames,
    settings.privacy.sensitiveProjectNames ?? [],
  );
  const analyticsSource = await loadAnalyticsSource(
    filters,
    settings,
    preferences,
    mapProjectLabel,
  );
  const { allCurrentRecords, allPreviousRecords, shouldCompare } = analyticsSource;
  const filteredCurrentRecords = filterSessionRecords(allCurrentRecords, filters);
  const filteredPreviousRecords = filterSessionRecords(allPreviousRecords, filters);

  const totalMinutes = filteredCurrentRecords.reduce(
    (sum, record) => sum + record.durationMinutes,
    0,
  );
  const previousMinutes = filteredPreviousRecords.reduce(
    (sum, record) => sum + record.durationMinutes,
    0,
  );
  const daily = computeDailyTotals(filteredCurrentRecords);
  const weekly = computeWeeklyTotals(daily, preferences.weekStartsOn);
  const breakdownProjects = computeBreakdown(filteredCurrentRecords, 'project', preferences.hour12);
  const breakdownLanguages = computeBreakdown(
    filteredCurrentRecords,
    'language',
    preferences.hour12,
  );
  const breakdownMachines = computeMachineBreakdown(filteredCurrentRecords, preferences.hour12);
  const previousProjects = computeBreakdown(filteredPreviousRecords, 'project', preferences.hour12);
  const previousLanguages = computeBreakdown(
    filteredPreviousRecords,
    'language',
    preferences.hour12,
  );
  const hourBuckets = computeHourBuckets(filteredCurrentRecords);
  const recentSessions = groupSessionRecordsByProjectAndDay(filteredCurrentRecords).slice(0, 8);

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
  const averageSessionMinutes =
    filteredCurrentRecords.length === 0
      ? 0
      : Math.round(totalMinutes / filteredCurrentRecords.length);
  const previousDaily = computeDailyTotals(filteredPreviousRecords);
  const dateWindow = resolveDateWindow(
    filters.range,
    filters.customRange ?? null,
    preferences.weekStartsOn,
  );
  const sessionKpis = computeSessionKpis(
    filteredCurrentRecords,
    dateWindow,
    shouldCompare ? previousMinutes : 0,
    settings.tracking.deepWorkThresholdMinutes ?? defaultDeepWorkThresholdMinutes,
  );
  const contextKpis = computeContextKpis(
    filteredCurrentRecords,
    dateWindow,
    breakdownProjects,
    breakdownLanguages,
    breakdownMachines,
  );

  const { eventKpis, fileKpis, insightScores } = await fetchBackendAnalyticsExtras(dateWindow.rangeLabel);

  return {
    summary: {
      totalMinutes,
      activeDays: daily.length,
      sessions: filteredCurrentRecords.length,
      averageSessionMinutes,
      comparison: {
        previousMinutes: shouldCompare ? previousMinutes : 0,
        previousSessions: shouldCompare ? filteredPreviousRecords.length : 0,
        previousActiveDays: shouldCompare ? previousDaily.length : 0,
      },
    },
    sessionKpis,
    contextKpis,
    eventKpis,
    fileKpis,
    insightScores,
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
      recent: recentSessions,
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
      mostActiveHour:
        hourBuckets.reduce<{ hourLabel: string; minutes: number } | null>((accumulator, bucket) => {
          if (!accumulator || bucket.minutes > accumulator.minutes) {
            return bucket;
          }
          return accumulator;
        }, null)?.hourLabel ?? null,
      streakDays: sessionKpis.currentStreakDays,
      hourBuckets,
    },
    comparison: {
      minutesDeltaPct: shouldCompare ? computeDelta(totalMinutes, previousMinutes) : 0,
      sessionsDeltaPct: shouldCompare
        ? computeDelta(filteredCurrentRecords.length, filteredPreviousRecords.length)
        : 0,
      activeDaysDeltaPct: shouldCompare ? computeDelta(daily.length, previousDaily.length) : 0,
      topProjectChange: {
        current: breakdownProjects[0]?.name ?? null,
        previous: shouldCompare ? (previousProjects[0]?.name ?? null) : null,
      },
      topLanguageChange: {
        current: breakdownLanguages[0]?.name ?? null,
        previous: shouldCompare ? (previousLanguages[0]?.name ?? null) : null,
      },
    },
    filters: analyticsSource.filters,
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
    const analytics = await fetchAnalyticsSnapshot(
      {
        range,
        customRange,
        project: 'all',
        language: 'all',
        machine: 'all',
      },
      settings,
    );

    const [overview, machines, bridgeReachable, dailySessions] = await Promise.all([
      GetOverviewData(),
      ListKnownMachines(),
      GetVSCodeBridgeHealth().catch(() => false),
      range === 'today'
        ? ListSessionsForRange(rangeWindow.startDate, rangeWindow.endDate)
        : Promise.resolve([] as contracts.Session[]),
    ]);

    const currentMachine = adaptMachine(settings.system, settings.extensionStatus, preferences);
    const knownMachines = machines.map((machine) =>
      adaptKnownMachine(machine, settings.extensionStatus, preferences),
    );
    const machineDistribution = analytics.machines.items.map((machine, index) => ({
      machineName: machine.name,
      minutes: machine.minutes,
      share: Math.round(machine.share),
      color: overviewChartPalette[index % overviewChartPalette.length],
    }));
    const todayTrendByInterval =
      range === 'today'
        ? buildTodayTrendByInterval(dailySessions, rangeWindow.start, preferences.hour12)
        : undefined;
    let trend: Array<{ label: string; value: number }>;
    if (range === 'today') {
      trend = todayTrendByInterval!['1h'];
    } else if (range === 'month') {
      trend = buildTrend(analytics.time.daily);
    } else {
      trend = buildTrend(analytics.time.daily);
    }

    return {
      range,
      todayMinutes: overview.todayMinutes,
      weekMinutes: overview.weekMinutes,
      sessionCount: analytics.summary.sessions,
      averageSessionMinutes: analytics.summary.averageSessionMinutes,
      codingDaysThisWeek: analytics.summary.activeDays,
      lastActiveAt: overview.lastActiveAt
        ? formatDateTime(overview.lastActiveAt, preferences.hour12)
        : '—',
      trackingEnabled: overview.trackingEnabled,
      localOnlyMode: overview.localOnlyMode,
      lastUpdatedAt: formatDateTime(overview.lastUpdatedAt, preferences.hour12),
      currentMachine,
      knownMachines,
      appStatus: buildAppStatus(settings, overview.lastUpdatedAt),
      lastActiveMachine: analytics.machines.lastActiveMachine ?? currentMachine.machineName,
      weeklyTrend: trend,
      todayTrendByInterval,
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
        language: session.language,
        durationMinutes: session.durationMinutes,
        startAt: formatDateTime(session.start, preferences.hour12),
        rangeStartAt: formatDateTime(session.groupStart, preferences.hour12),
        rangeEndAt: formatDateTime(session.groupEnd, preferences.hour12),
        machineName: session.machine,
        osLabel: session.osLabel,
        sessionCount: session.sessionCount,
        machineCount: session.machineCount,
        subSessions: session.subSessions.map((subSession) => ({
          id: subSession.id,
          language: subSession.language,
          durationMinutes: subSession.durationMinutes,
          startAt: formatDateTime(subSession.start, preferences.hour12),
          endAt: formatDateTime(subSession.end, preferences.hour12),
          machineName: subSession.machine,
          osLabel: subSession.osLabel,
        })),
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
    const knownMachines = machines.map((machine) =>
      adaptKnownMachine(machine, settings.extensionStatus, preferences),
    );
    const machinesById = machineIndex(machines);
    const mapProjectLabel = createProjectLabelMapper(
      preferences.obfuscateProjectNames,
      settings.privacy.sensitiveProjectNames ?? [],
    );
    const sessionRecords = data.sessions.map((session) =>
      mapSessionRecord(session, machinesById, preferences, mapProjectLabel),
    );
    const sessions = groupSessionRecordsByProjectAndDay(sessionRecords).map((session) => ({
      id: session.id,
      project: session.project,
      language: session.language,
      durationMinutes: session.durationMinutes,
      startAt: formatDateTime(session.start, preferences.hour12),
      rangeStartAt: formatDateTime(session.groupStart, preferences.hour12),
      rangeEndAt: formatDateTime(session.groupEnd, preferences.hour12),
      machineName: session.machine,
      osLabel: session.osLabel,
      sessionCount: session.sessionCount,
      machineCount: session.machineCount,
      subSessions: session.subSessions.map((subSession) => ({
        id: subSession.id,
        language: subSession.language,
        durationMinutes: subSession.durationMinutes,
        startAt: formatDateTime(subSession.start, preferences.hour12),
        endAt: formatDateTime(subSession.end, preferences.hour12),
        machineName: subSession.machine,
        osLabel: subSession.osLabel,
      })),
    }));
    const latestSession = [...data.sessions].sort((left, right) => {
      if (left.endTime !== right.endTime) {
        return right.endTime.localeCompare(left.endTime);
      }
      if (left.startTime !== right.startTime) {
        return right.startTime.localeCompare(left.startTime);
      }
      return right.id.localeCompare(left.id);
    })[0];
    const latestSessionMachine = latestSession
      ? resolveDisplayMachineName(
          latestSession.machineName ?? machinesById.get(latestSession.machineId)?.machineName,
          latestSession.machineId,
          preferences,
        )
      : currentMachine.machineName;

    return {
      range,
      totalSessions: data.totalSessions,
      averageSessionMinutes: data.averageSessionMinutes,
      longestSessionMinutes: data.longestSessionMinutes,
      lastActiveAt: formatDateTime(
        latestSession?.endTime ?? latestSession?.startTime,
        preferences.hour12,
      ),
      lastActiveMachine: latestSessionMachine,
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
