import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAnalyticsSnapshot } from '@/lib/backend/page-data';

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

const settings = {
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
  extension: {
    sendMachineAttribution: true,
  },
  extensionStatus: {
    lastEventAt: '2026-04-13T16:00:00Z',
  },
  dataStorage: {
    lastProcessedAt: '2026-04-13T16:00:00Z',
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

describe('loadAnalyticsSnapshot all-time range', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    bridge.GetSettingsData.mockResolvedValue(settings);
    bridge.ListKnownMachines.mockResolvedValue([
      { machineId: 'current-machine', machineName: 'Current Machine', osPlatform: 'darwin' },
    ]);
    bridge.ListSessionsForRange.mockResolvedValue([
      {
        id: 'session-1',
        date: '2026-04-13',
        startTime: '2026-04-13T15:00:00Z',
        endTime: '2026-04-13T16:00:00Z',
        durationMinutes: 60,
        machineId: 'current-machine',
        projectName: 'kairos',
        language: 'TypeScript',
        sourceEventCount: 6,
      },
    ]);
  });

  it('fetches all sessions without building a previous comparison window', async () => {
    const result = await loadAnalyticsSnapshot({
      range: 'all-time',
      customRange: null,
      project: 'all',
      language: 'all',
      machine: 'all',
    });

    expect(bridge.ListSessionsForRange).toHaveBeenCalledTimes(1);
    expect(bridge.ListSessionsForRange).toHaveBeenCalledWith('0000-00-00', '9999-99-99');
    expect(result.summary.comparison).toEqual({
      previousMinutes: 0,
      previousSessions: 0,
      previousActiveDays: 0,
    });
    expect(result.comparison.minutesDeltaPct).toBe(0);
    expect(result.comparison.sessionsDeltaPct).toBe(0);
    expect(result.comparison.activeDaysDeltaPct).toBe(0);
    expect(result.comparison.topProjectChange.previous).toBeNull();
    expect(result.comparison.topLanguageChange.previous).toBeNull();
  });
});
