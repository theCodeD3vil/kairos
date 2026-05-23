import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadAnalyticsSnapshot } from '@/lib/backend/page-data';

const bridge = vi.hoisted(() => ({
  GetAnalyticsData: vi.fn(),
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
  GetAnalyticsData: bridge.GetAnalyticsData,
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
    deepWorkThresholdMinutes: 60,
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
    bridge.GetAnalyticsData.mockResolvedValue({ eventKpis: null, fileKpis: null });
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
    expect(result.sessionKpis.deepWorkMinutes).toBe(60);
    expect(result.sessionKpis.deepWorkBlockCount).toBe(1);
    expect(result.sessionKpis.duration.medianMinutes).toBe(60);
    expect(result.sessionKpis.duration.p90Minutes).toBe(60);
    expect(result.sessionKpis.bestDay.date).toBe('2026-04-13');
    expect(result.sessionKpis.weekdayHeatmap).toHaveLength(7);
    expect(result.sessionKpis.hourlyHeatmap).toHaveLength(24);
    expect(result.contextKpis.projectFocusScore).toBe(100);
    expect(result.contextKpis.languageFocusScore).toBe(100);
    expect(result.contextKpis.projectMomentum).toEqual([]);
  });

  it('uses the configured deep work threshold', async () => {
    bridge.GetSettingsData.mockResolvedValue({
      ...settings,
      tracking: {
        ...settings.tracking,
        deepWorkThresholdMinutes: 90,
      },
    });

    const result = await loadAnalyticsSnapshot({
      range: 'all-time',
      customRange: null,
      project: 'all',
      language: 'all',
      machine: 'all',
    });

    expect(result.sessionKpis.deepWorkThresholdMinutes).toBe(90);
    expect(result.sessionKpis.deepWorkMinutes).toBe(0);
    expect(result.sessionKpis.deepWorkBlockCount).toBe(0);
  });

  it('surfaces event activity KPIs from GetAnalyticsData when present', async () => {
    bridge.GetAnalyticsData.mockResolvedValue({
      eventKpis: {
        totalEvents: 12,
        eventsInSessions: 10,
        editCount: 6,
        saveCount: 3,
        openCount: 1,
        heartbeatCount: 0,
        focusCount: 0,
        blurCount: 0,
        activeEventCount: 9,
        passiveEventCount: 0,
        neutralEventCount: 1,
        activeShare: 90,
        passiveShare: 0,
        neutralShare: 10,
        eventDensityPerMinute: 0.2,
        editSaveRatio: 2,
        medianFirstOpenToFirstEditSeconds: 30,
        medianEditToSaveSeconds: 15,
        medianSessionWarmupSeconds: 60,
        warmupQualifyingSessionCount: 1,
        medianReturnAfterIdleMinutes: 0,
        activityBurstCount: 1,
        heartbeatOnlySessionCount: 0,
        heartbeatOnlySessionShare: 0,
        trackEditEvents: true,
        trackSaveEvents: true,
        trackFileOpenEvents: true,
        eventTypeMixByProject: [
          {
            name: 'kairos',
            totalEvents: 10,
            editCount: 6,
            saveCount: 3,
            openCount: 1,
            heartbeatCount: 0,
            focusCount: 0,
            blurCount: 0,
          },
        ],
        eventTypeMixByLanguage: [],
        eventTypeMixByMachine: [],
      },
    });

    const result = await loadAnalyticsSnapshot({
      range: 'all-time',
      customRange: null,
      project: 'all',
      language: 'all',
      machine: 'all',
    });

    expect(result.eventKpis.editCount).toBe(6);
    expect(result.eventKpis.saveCount).toBe(3);
    expect(result.eventKpis.editSaveRatio).toBe(2);
    expect(result.eventKpis.eventTypeMixByProject).toHaveLength(1);
    expect(result.eventKpis.eventTypeMixByProject[0]?.name).toBe('kairos');
    expect(result.eventKpis.trackEditEvents).toBe(true);
  });

  it('falls back to empty event KPIs when the backend call rejects', async () => {
    bridge.GetAnalyticsData.mockRejectedValue(new Error('bridge offline'));

    const result = await loadAnalyticsSnapshot({
      range: 'all-time',
      customRange: null,
      project: 'all',
      language: 'all',
      machine: 'all',
    });

    expect(result.eventKpis.editCount).toBe(0);
    expect(result.eventKpis.eventTypeMixByProject).toEqual([]);
    expect(result.fileKpis.uniqueFileCount).toBe(0);
    expect(result.fileKpis.topFiles).toEqual([]);
  });

  it('surfaces file activity KPIs from GetAnalyticsData when opt-in is enabled', async () => {
    bridge.GetAnalyticsData.mockResolvedValue({
      eventKpis: null,
      fileKpis: {
        optInEnabled: true,
        filePathsAvailable: true,
        pathsMasked: false,
        uniqueFileCount: 2,
        averageUniqueFilesPerSession: 2,
        totalAttributedMinutes: 60,
        topFiles: [
          {
            filePath: 'apps/desktop/internal/storage/sqlite.go',
            fileName: 'sqlite.go',
            category: 'source',
            totalMinutes: 40,
            eventCount: 4,
            editCount: 3,
            saveCount: 1,
            shareOfTotal: 66.7,
          },
        ],
        mostRevisitedFiles: [],
        categoryBreakdown: [
          {
            category: 'source',
            totalMinutes: 40,
            eventCount: 4,
            fileCount: 1,
            shareOfTotal: 66.7,
          },
          {
            category: 'docs',
            totalMinutes: 20,
            eventCount: 1,
            fileCount: 1,
            shareOfTotal: 33.3,
          },
        ],
        testVsSource: {
          testMinutes: 0,
          sourceMinutes: 40,
          testShareOfCode: 0,
        },
        documentationMinutes: 20,
        configMinutes: 0,
        infrastructureMinutes: 0,
        fileChurnLeaders: [],
        longRunningFocusBlocks: [],
        projectAreaBreakdown: [],
      },
    });

    const result = await loadAnalyticsSnapshot({
      range: 'all-time',
      customRange: null,
      project: 'all',
      language: 'all',
      machine: 'all',
    });

    expect(result.fileKpis.optInEnabled).toBe(true);
    expect(result.fileKpis.uniqueFileCount).toBe(2);
    expect(result.fileKpis.topFiles[0]?.fileName).toBe('sqlite.go');
    expect(result.fileKpis.categoryBreakdown).toHaveLength(2);
    expect(result.fileKpis.documentationMinutes).toBe(20);
  });
});
