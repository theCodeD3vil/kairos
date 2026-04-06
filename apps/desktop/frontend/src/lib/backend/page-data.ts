import { GetAnalyticsData, GetCalendarDayData, GetCalendarMonthData, GetOverviewData, GetSettingsData, ListKnownMachines } from '../../../wailsjs/go/main/App';
import type { contracts } from '../../../wailsjs/go/models';
import { overviewChartPalette, syncUptimeColors } from '@/components/overview/chart-colors';
import type { OverviewRange, OverviewSnapshot } from '@/components/overview/types';
import type { CalendarDay, CalendarDayDetail } from '@/data/mockCalendar';
import type { DateRange } from '@/components/ruixen/range-calendar';
import type { AppStatus, MachineInfo } from '@/mocks/system-info';

const syncColorByStatus = {
  Healthy: syncUptimeColors.high,
  Degraded: syncUptimeColors.medium,
  Offline: syncUptimeColors.critical,
} as const;

function formatDateTime(value?: string) {
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
  });
}

function formatTime(value?: string) {
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

function buildOverviewRangeLabel(range: OverviewRange, customRange: DateRange | null) {
  if (range !== 'custom' || !customRange) {
    return range;
  }

  const start = customRange.start.toISOString().slice(0, 10);
  const end = customRange.end.toISOString().slice(0, 10);
  return `${start}..${end}`;
}

function buildTrend(points: contracts.DailyTotalPoint[]) {
  return points.map((point) => ({
    label: new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    value: Number((point.totalMinutes / 60).toFixed(2)),
  }));
}

function buildSyncHealth(status: contracts.SettingsData['extensionStatus'], lastUpdatedAt: string): OverviewSnapshot['syncHealth'] {
  const syncStatus: OverviewSnapshot['syncHealth']['status'] = status.connected
    ? 'Healthy'
    : status.installed
      ? 'Degraded'
      : 'Offline';
  const color = syncColorByStatus[syncStatus];

  return {
    status: syncStatus,
    lastSyncAt: formatDateTime(status.lastHandshakeAt ?? lastUpdatedAt),
    blocks: Array.from({ length: 40 }, (_, index) => ({
      key: `sync-${index + 1}`,
      color,
      tooltip: `${syncStatus} at slot ${index + 1}`,
    })),
  };
}

function adaptMachine(system: contracts.SettingsData['system'], extensionStatus: contracts.SettingsData['extensionStatus']): MachineInfo {
  return {
    machineName: system.machineName,
    machineId: system.machineId,
    hostname: system.hostname ?? '',
    os: formatOsLabel(system),
    osVersion: system.osVersion ?? '',
    architecture: system.arch ?? '',
    editorName: system.editor === 'vscode' ? 'VS Code' : system.editor,
    editorVersion: system.editorVersion ?? '',
    extensionVersion: extensionStatus.extensionVersion ?? system.extensionVersion ?? '',
    lastSeenAt: formatDateTime(system.lastSeenAt),
  };
}

function adaptKnownMachine(machine: contracts.MachineInfo, extensionStatus: contracts.SettingsData['extensionStatus']): MachineInfo {
  return {
    machineName: machine.machineName,
    machineId: machine.machineId,
    hostname: machine.hostname ?? '',
    os: formatOsLabel(machine),
    osVersion: machine.osVersion ?? '',
    architecture: machine.arch ?? '',
    editorName: 'VS Code',
    editorVersion: '',
    extensionVersion: extensionStatus.extensionVersion ?? '',
    lastSeenAt: 'Recently seen',
  };
}

function buildAppStatus(settings: contracts.SettingsData, overview: contracts.OverviewData): AppStatus {
  return {
    appVersion: settings.about.appVersion,
    trackingEnabled: overview.trackingEnabled,
    localOnlyMode: overview.localOnlyMode,
    lastUpdatedAt: formatDateTime(overview.lastUpdatedAt),
  };
}

function latestActiveMachineName(machineSummaries: contracts.MachineSummary[], currentMachine: MachineInfo) {
  const sorted = [...machineSummaries].sort((left, right) => (right.lastActiveAt ?? '').localeCompare(left.lastActiveAt ?? ''));
  return sorted[0]?.machineName ?? currentMachine.machineName;
}

export async function loadOverviewSnapshot(range: OverviewRange, customRange: DateRange | null): Promise<OverviewSnapshot> {
  const rangeLabel = buildOverviewRangeLabel(range, customRange);
  const [overview, analytics, settings, machines] = await Promise.all([
    GetOverviewData(),
    GetAnalyticsData(rangeLabel),
    GetSettingsData(),
    ListKnownMachines(),
  ]);

  const currentMachine = adaptMachine(settings.system, settings.extensionStatus);
  const knownMachines = machines.map((machine) => adaptKnownMachine(machine, settings.extensionStatus));
  const machineDistribution = analytics.machineSummaries.map((machine, index) => ({
    machineName: machine.machineName,
    minutes: machine.totalMinutes,
    share: Math.round(machine.totalMinutes === 0 || analytics.totalMinutes === 0 ? 0 : (machine.totalMinutes / analytics.totalMinutes) * 100),
    color: overviewChartPalette[index % overviewChartPalette.length],
  }));

  return {
    range,
    todayMinutes: overview.todayMinutes,
    weekMinutes: overview.weekMinutes,
    sessionCount: analytics.sessionCount,
    averageSessionMinutes: analytics.averageSessionMinutes,
    codingDaysThisWeek: overview.codingDaysThisWeek,
    lastActiveAt: formatDateTime(overview.lastActiveAt),
    trackingEnabled: overview.trackingEnabled,
    localOnlyMode: overview.localOnlyMode,
    lastUpdatedAt: formatDateTime(overview.lastUpdatedAt),
    currentMachine,
    knownMachines,
    appStatus: buildAppStatus(settings, overview),
    lastActiveMachine: latestActiveMachineName(analytics.machineSummaries, currentMachine),
    weeklyTrend: buildTrend(analytics.dailyTotals),
    topProjects: analytics.projectSummaries.slice(0, 5).map((project, index) => ({
      project: project.projectName,
      minutes: project.totalMinutes,
      recentActivityAt: formatDateTime(project.lastActiveAt),
      color: overviewChartPalette[index % overviewChartPalette.length],
    })),
    topLanguages: analytics.languageSummaries.slice(0, 5).map((language) => ({
      language: language.language,
      minutes: language.totalMinutes,
      share: Math.round(language.shareOfTotal * 100),
    })),
    machineDistribution,
    recentSessions: analytics.recentSessions.map((session) => ({
      project: session.projectName,
      durationMinutes: session.durationMinutes,
      startAt: formatDateTime(session.startTime),
      machineName: session.machineName ?? session.machineId,
      osLabel: formatOsLabel(
        machines.find((machine) => machine.machineId === session.machineId) ?? {
          machineId: session.machineId,
          machineName: session.machineName ?? session.machineId,
          osPlatform: 'linux',
        },
      ),
    })),
    activeHoursSummary: overview.activeHoursSummary,
    syncHealth: buildSyncHealth(settings.extensionStatus, overview.lastUpdatedAt),
  };
}

export async function loadCalendarMonth(year: number, month: number): Promise<{ monthLabel: string; days: CalendarDay[] }> {
  const monthLabel = `${year}-${String(month + 1).padStart(2, '0')}`;
  const data = await GetCalendarMonthData(monthLabel);

  return {
    monthLabel: data.monthLabel,
    days: data.days.map((day) => ({
      date: day.date,
      totalMinutes: day.totalMinutes,
      sessionCount: day.sessionCount,
      topProject: day.topProject ?? null,
      topLanguage: day.topLanguage ?? null,
      machineCount: day.machineCount,
      hadActivity: day.hadActivity,
    })),
  };
}

export async function loadCalendarDay(date: string): Promise<CalendarDayDetail | null> {
  const data = await GetCalendarDayData(date);
  if (!data.hadActivity) {
    return null;
  }

  return {
    date: data.date,
    totalMinutes: data.totalMinutes,
    sessionCount: data.sessionCount,
    averageSessionMinutes: data.averageSessionMinutes,
    firstActiveAt: formatTime(data.firstActiveAt),
    lastActiveAt: formatTime(data.lastActiveAt),
    topProject: data.topProject ?? null,
    topLanguage: data.topLanguage ?? null,
    machines: data.machineBreakdown.map((machine) => ({
      name: machine.machineName,
      os: formatOsLabel({ osPlatform: machine.osPlatform ?? '' }),
      minutes: machine.totalMinutes,
    })),
    sessions: data.sessions.map((session) => ({
      id: session.id,
      start: formatTime(session.startTime) ?? session.startTime,
      durationMinutes: session.durationMinutes,
      project: session.projectName,
      machine: session.machineName ?? session.machineId,
      language: session.language,
    })),
    projectBreakdown: data.projectBreakdown.map((project) => ({
      project: project.projectName,
      minutes: project.totalMinutes,
      sessionCount: project.sessionCount,
    })),
  };
}
