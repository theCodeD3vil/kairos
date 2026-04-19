import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadOverviewSnapshot } from '@/lib/backend/page-data';

const bridge = vi.hoisted(() => ({
  GetCalendarDayData: vi.fn(),
  GetCalendarMonthData: vi.fn(),
  GetOverviewData: vi.fn(),
  GetSessionsPageData: vi.fn(),
  GetSettingsData: vi.fn(),
  GetVSCodeBridgeHealth: vi.fn(),
  ListKnownMachines: vi.fn(),
  ListSessionsForRange: vi.fn(),
}));

vi.mock('../../../wailsjs/go/main/App', () => ({
  GetCalendarDayData: bridge.GetCalendarDayData,
  GetCalendarMonthData: bridge.GetCalendarMonthData,
  GetOverviewData: bridge.GetOverviewData,
  GetSessionsPageData: bridge.GetSessionsPageData,
  GetSettingsData: bridge.GetSettingsData,
  GetVSCodeBridgeHealth: bridge.GetVSCodeBridgeHealth,
  ListKnownMachines: bridge.ListKnownMachines,
  ListSessionsForRange: bridge.ListSessionsForRange,
}));

const baseSettings = {
  general: {
    timeFormat: '24h',
    weekStartsOn: 'monday',
  },
  privacy: {
    localOnlyMode: true,
    showMachineNames: true,
    showHostname: false,
    obfuscateProjectNames: false,
    minimizeExtensionMetadata: false,
    sensitiveProjectNames: [],
  },
  tracking: {
    trackingEnabled: true,
    trackMachineAttribution: true,
  },
  about: {
    appVersion: '1.0.0',
  },
  extension: {
    sendMachineAttribution: true,
  },
  extensionStatus: {
    extensionVersion: '1.0.0',
    connected: true,
    installed: true,
    lastEventAt: '2026-04-13T16:00:00Z',
    lastHandshakeAt: '2026-04-13T16:00:00Z',
  },
  system: {
    machineName: 'Current Machine',
    machineId: 'current-machine',
    hostname: 'host',
    osPlatform: 'darwin',
    osVersion: '15',
    arch: 'arm64',
    editor: 'vscode',
    editorVersion: '1.99.0',
    extensionVersion: '1.0.0',
    lastSeenAt: '2026-04-13T16:00:00Z',
  },
} as const;

const baseOverview = {
  todayMinutes: 60,
  weekMinutes: 60,
  averageSessionMinutes: 60,
  sessionCount: 1,
  codingDaysThisWeek: 1,
  lastActiveAt: '',
  trackingEnabled: true,
  localOnlyMode: true,
  lastUpdatedAt: '',
  activeHoursSummary: '00:00 - 01:00',
};

describe('loadOverviewSnapshot 1D trend intervals', () => {
  beforeEach(() => {
    const isoDay = new Date().toISOString().slice(0, 10);
    const sessionStart = `${isoDay}T00:00:00Z`;
    const sessionEnd = `${isoDay}T01:00:00Z`;

    vi.resetAllMocks();
    bridge.GetSettingsData.mockResolvedValue(baseSettings);
    bridge.GetOverviewData.mockResolvedValue({
      ...baseOverview,
      lastActiveAt: sessionEnd,
      lastUpdatedAt: sessionEnd,
    });
    bridge.GetVSCodeBridgeHealth.mockResolvedValue(true);
    bridge.ListKnownMachines.mockResolvedValue([
      { machineId: 'current-machine', machineName: 'Current Machine', osPlatform: 'darwin' },
    ]);
    bridge.ListSessionsForRange.mockResolvedValue([
      {
        id: 'session-1',
        date: isoDay,
        startTime: sessionStart,
        endTime: sessionEnd,
        durationMinutes: 60,
        machineId: 'current-machine',
        projectName: 'kairos',
        language: 'TypeScript',
        sourceEventCount: 6,
      },
    ]);
  });

  it('builds 5m/30m/1h/2h/6h trend buckets for today range', async () => {
    const result = await loadOverviewSnapshot('today', null);

    expect(result.todayTrendByInterval).toBeDefined();
    expect(result.todayTrendByInterval?.['5m']).toHaveLength(288);
    expect(result.todayTrendByInterval?.['30m']).toHaveLength(48);
    expect(result.todayTrendByInterval?.['1h']).toHaveLength(24);
    expect(result.todayTrendByInterval?.['2h']).toHaveLength(12);
    expect(result.todayTrendByInterval?.['6h']).toHaveLength(4);

    expect(result.todayTrendByInterval?.['30m'].slice(0, 3).map((point) => point.value)).toEqual([0.5, 0.5, 0]);
    expect(result.todayTrendByInterval?.['1h'].slice(0, 3).map((point) => point.value)).toEqual([1, 0, 0]);
    expect(result.todayTrendByInterval?.['2h'].slice(0, 2).map((point) => point.value)).toEqual([1, 0]);
    expect(result.todayTrendByInterval?.['6h'].slice(0, 2).map((point) => point.value)).toEqual([1, 0]);

    // Default trend remains 1h so existing chart behavior is preserved.
    expect(result.weeklyTrend).toEqual(result.todayTrendByInterval?.['1h']);
  });

  it('keeps interval map undefined for non-today ranges', async () => {
    bridge.ListSessionsForRange.mockResolvedValue([]);

    const result = await loadOverviewSnapshot('week', null);

    expect(result.todayTrendByInterval).toBeUndefined();
  });

  it('uses daily points for monthly trend instead of weekly aggregates', async () => {
    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const isoForDay = (offsetFromMonthStart: number) => {
      const day = new Date(monthStart);
      day.setUTCDate(day.getUTCDate() + offsetFromMonthStart);
      return day.toISOString().slice(0, 10);
    };

    const sessions = [6, 7, 8].map((offset, index) => {
      const isoDay = isoForDay(offset);
      return {
        id: `session-month-${index + 1}`,
        date: isoDay,
        startTime: `${isoDay}T00:00:00Z`,
        endTime: `${isoDay}T01:00:00Z`,
        durationMinutes: 60,
        machineId: 'current-machine',
        projectName: 'kairos',
        language: 'TypeScript',
        sourceEventCount: 6,
      };
    });
    bridge.ListSessionsForRange.mockResolvedValue(sessions);

    const result = await loadOverviewSnapshot('month', null);

    // Daily trend should keep one point per active day (3), whereas weekly would collapse to 1.
    expect(result.weeklyTrend).toHaveLength(3);
  });

  it('requests full month boundaries for month range', async () => {
    bridge.ListSessionsForRange.mockResolvedValue([]);

    await loadOverviewSnapshot('month', null);

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
    const expectedStart = monthStart.toISOString().slice(0, 10);
    const expectedEnd = monthEnd.toISOString().slice(0, 10);

    expect(bridge.ListSessionsForRange).toHaveBeenCalledWith(expectedStart, expectedEnd);
  });

  it('does not mark the newest sync-health block offline when connection is healthy', async () => {
    const nowIso = new Date().toISOString();
    bridge.GetSettingsData.mockResolvedValue({
      ...baseSettings,
      extensionStatus: {
        ...baseSettings.extensionStatus,
        connected: true,
        installed: true,
        lastEventAt: nowIso,
        lastHandshakeAt: nowIso,
      },
    });

    const result = await loadOverviewSnapshot('today', null);
    const latestBlock = result.syncHealth.blocks.at(-1);

    expect(latestBlock).toBeDefined();
    expect(latestBlock?.tooltip).toContain('Healthy');
    expect(latestBlock?.tooltip).not.toContain('Offline');
  });
});
