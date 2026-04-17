import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadSessionsScreenData } from '@/lib/backend/page-data';

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
    showMachineNames: true,
    showHostname: false,
    obfuscateProjectNames: false,
    minimizeExtensionMetadata: false,
    sensitiveProjectNames: [],
  },
  tracking: {
    trackMachineAttribution: true,
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

describe('loadSessionsScreenData regressions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    bridge.GetSettingsData.mockResolvedValue(baseSettings);
    bridge.ListKnownMachines.mockResolvedValue([
      { machineId: 'm-alpha', machineName: 'Alpha', osPlatform: 'darwin' },
      { machineId: 'm-beta', machineName: 'Beta', osPlatform: 'linux' },
    ]);
  });

  it('computes last active from latest end time (not latest start time)', async () => {
    bridge.GetSessionsPageData.mockResolvedValue({
      totalSessions: 2,
      averageSessionMinutes: 120,
      longestSessionMinutes: 300,
      sessions: [
        {
          id: 'session-alpha',
          date: '2026-04-13',
          startTime: '2026-04-13T08:00:00Z',
          endTime: '2026-04-13T13:00:00Z',
          durationMinutes: 300,
          machineId: 'm-alpha',
          projectName: 'alpha',
          language: 'TypeScript',
          sourceEventCount: 10,
        },
        {
          id: 'session-beta',
          date: '2026-04-13',
          startTime: '2026-04-13T12:00:00Z',
          endTime: '2026-04-13T12:30:00Z',
          durationMinutes: 30,
          machineId: 'm-beta',
          projectName: 'beta',
          language: 'Go',
          sourceEventCount: 4,
        },
      ],
    });

    const result = await loadSessionsScreenData('week', null);

    const expectedLastActive = new Date('2026-04-13T13:00:00Z').toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    expect(result.lastActiveAt).toBe(expectedLastActive);
    expect(result.lastActiveMachine).toBe('Alpha');
  });

  it('orders grouped sessions by latest activity end time', async () => {
    bridge.GetSessionsPageData.mockResolvedValue({
      totalSessions: 2,
      averageSessionMinutes: 190,
      longestSessionMinutes: 360,
      sessions: [
        {
          id: 'group-a',
          date: '2026-04-13',
          startTime: '2026-04-13T09:00:00Z',
          endTime: '2026-04-13T15:00:00Z',
          durationMinutes: 360,
          machineId: 'm-alpha',
          projectName: 'alpha',
          language: 'TypeScript',
          sourceEventCount: 8,
        },
        {
          id: 'group-b',
          date: '2026-04-13',
          startTime: '2026-04-13T14:00:00Z',
          endTime: '2026-04-13T14:20:00Z',
          durationMinutes: 20,
          machineId: 'm-beta',
          projectName: 'beta',
          language: 'Go',
          sourceEventCount: 2,
        },
      ],
    });

    const result = await loadSessionsScreenData('week', null);

    expect(result.sessions.map((session) => session.project)).toEqual(['alpha', 'beta']);
  });

  it('normalizes typescriptreact aliases to React for display labels', async () => {
    bridge.GetSessionsPageData.mockResolvedValue({
      totalSessions: 1,
      averageSessionMinutes: 60,
      longestSessionMinutes: 60,
      sessions: [
        {
          id: 'session-react',
          date: '2026-04-13',
          startTime: '2026-04-13T10:00:00Z',
          endTime: '2026-04-13T11:00:00Z',
          durationMinutes: 60,
          machineId: 'm-alpha',
          projectName: 'kairos-web',
          language: 'typescriptreact',
          sourceEventCount: 5,
        },
      ],
    });

    const result = await loadSessionsScreenData('week', null);

    expect(result.sessions[0]?.language).toBe('React');
    expect(result.sessions[0]?.subSessions[0]?.language).toBe('React');
  });
});
