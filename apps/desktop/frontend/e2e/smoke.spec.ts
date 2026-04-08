import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const now = new Date().toISOString();
    const settings = ({
      general: {
        machineDisplayName: 'Kairos Dev Machine',
        defaultDateRange: 'week',
        timeFormat: '24h',
        weekStartsOn: 'monday',
        preferredLandingPage: 'overview',
      },
      privacy: {
        localOnlyMode: true,
        filePathMode: 'masked',
        showMachineNames: true,
        showHostname: false,
        obfuscateProjectNames: false,
        sensitiveProjectNames: [],
        minimizeExtensionMetadata: false,
      },
      tracking: {
        trackingEnabled: true,
        idleDetectionEnabled: true,
        trackProjectActivity: true,
        trackLanguageActivity: true,
        trackMachineAttribution: true,
        trackSessionBoundaries: true,
        idleTimeoutMinutes: 5,
        sessionMergeThresholdMinutes: 10,
      },
      exclusions: {
        folders: [],
        projectNames: [],
        workspacePatterns: [],
        fileExtensions: [],
        machines: [],
      },
      extension: {
        autoConnect: true,
        sendHeartbeatEvents: false,
        heartbeatIntervalSeconds: 30,
        sendProjectMetadata: true,
        sendLanguageMetadata: true,
        sendMachineAttribution: true,
        respectDesktopExclusions: true,
        bufferEventsWhenOffline: true,
        retryConnectionAutomatically: true,
        trackOnlyWhenFocused: false,
        trackFileOpenEvents: false,
        trackSaveEvents: false,
        trackEditEvents: true,
      },
      extensionStatus: {
        installed: true,
        connected: true,
        editor: 'vscode',
        extensionVersion: '1.0.5',
        lastEventAt: now,
        lastHandshakeAt: now,
      },
      system: {
        machineId: 'machine-1',
        machineName: 'Kairos Dev Machine',
        hostname: 'kairos-dev',
        osPlatform: 'darwin',
        osVersion: '14.0',
        arch: 'arm64',
        editor: 'vscode',
        editorVersion: '1.102.0',
        appVersion: '1.0.5',
        extensionVersion: '1.0.5',
        lastSeenAt: now,
      },
      appBehavior: {
        launchOnStartup: false,
        startMinimized: false,
        minimizeToTray: true,
        openOnSystemLogin: false,
        rememberLastPage: true,
        restoreLastDateRange: true,
      },
      dataStorage: {
        localDataPath: '/tmp/kairos.sqlite3',
        databaseStatus: 'ready',
        lastProcessedAt: now,
        pendingEventCount: 0,
      },
      about: {
        appName: 'Kairos',
        appVersion: '1.0.5',
        environment: 'desktop',
        buildChannel: 'stable',
        desktopVersion: '1.0.5',
        extensionVersion: '1.0.5',
        licenseSummary: 'MIT',
        repositoryUrl: 'https://github.com/theCodeD3vil/kairos',
      },
    });
    const knownMachines = [
      {
        machineId: 'machine-1',
        machineName: 'Kairos Dev Machine',
        hostname: 'kairos-dev',
        osPlatform: 'darwin',
        osVersion: '14.0',
        arch: 'arm64',
      },
    ];
    const buildSession = (startDate: string) => ({
      id: `session-${startDate}`,
      date: startDate,
      startTime: `${startDate}T09:00:00.000Z`,
      endTime: `${startDate}T10:00:00.000Z`,
      durationMinutes: 60,
      projectName: 'kairos',
      language: 'TypeScript',
      machineId: 'machine-1',
      machineName: 'Kairos Dev Machine',
      sourceEventCount: 8,
    });

    (window as unknown as { runtime?: Record<string, unknown> }).runtime = {
      EventsOnMultiple: () => () => {},
      BrowserOpenURL: () => {},
      IsNotificationAvailable: () => Promise.resolve(false),
      CheckNotificationAuthorization: () => Promise.resolve(false),
      RequestNotificationAuthorization: () => Promise.resolve(false),
      InitializeNotifications: () => Promise.resolve(),
      SendNotification: () => Promise.resolve(),
    };

    (window as unknown as { go?: Record<string, unknown> }).go = {
      main: {
        App: {
          GetSettingsData: () => Promise.resolve(settings),
          GetOverviewData: () => Promise.resolve({
            todayMinutes: 60,
            weekMinutes: 360,
            sessionCount: 6,
            averageSessionMinutes: 60,
            codingDaysThisWeek: 6,
            lastActiveAt: now,
            topProjects: [],
            topLanguages: [],
            recentSessions: [],
            weeklyTrend: [],
            activeHoursSummary: '09:00-10:00',
            trackingEnabled: true,
            localOnlyMode: true,
            currentMachine: knownMachines[0],
            lastUpdatedAt: now,
          }),
          GetSessionsPageData: (rangeLabel: string) => Promise.resolve({
            rangeLabel,
            totalSessions: 1,
            averageSessionMinutes: 60,
            longestSessionMinutes: 60,
            sessions: [buildSession(new Date().toISOString().slice(0, 10))],
          }),
          GetCalendarMonthData: (monthLabel: string) => Promise.resolve({
            month: monthLabel,
            monthLabel,
            days: [
              {
                date: `${monthLabel}-01`,
                totalMinutes: 60,
                sessionCount: 1,
                topProject: 'kairos',
                topLanguage: 'TypeScript',
                machineCount: 1,
                hadActivity: true,
              },
            ],
          }),
          GetCalendarDayData: (date: string) => Promise.resolve({
            date,
            totalMinutes: 60,
            sessionCount: 1,
            averageSessionMinutes: 60,
            firstActiveAt: `${date}T09:00:00.000Z`,
            lastActiveAt: `${date}T10:00:00.000Z`,
            topProject: 'kairos',
            topLanguage: 'TypeScript',
            projectBreakdown: [
              {
                projectName: 'kairos',
                totalMinutes: 60,
                sessionCount: 1,
                activeDays: 1,
                shareOfTotal: 100,
              },
            ],
            machineBreakdown: [
              {
                machineId: 'machine-1',
                machineName: 'Kairos Dev Machine',
                osPlatform: 'darwin',
                totalMinutes: 60,
                sessionCount: 1,
                activeDays: 1,
              },
            ],
            sessions: [buildSession(date)],
            hadActivity: true,
          }),
          ListKnownMachines: () => Promise.resolve(knownMachines),
          ListSessionsForRange: (start: string) => Promise.resolve([buildSession(start)]),
          GetVSCodeBridgeHealth: () => Promise.resolve(true),
          GetAutostartRegistrationStatus: () => Promise.resolve({
            enabled: false,
            platform: 'darwin',
            mechanism: 'launchd',
            location: '/Users/test/Library/LaunchAgents',
          }),
          CheckForDesktopUpdate: () => Promise.resolve({
            checkedAt: now,
            currentVersion: '1.0.5',
            latestVersion: '1.0.5',
            updateAvailable: false,
            releaseUrl: 'https://github.com/theCodeD3vil/kairos/releases/tag/v1.0.5',
            assetUrl: '',
            releaseNotes: '',
            preRelease: false,
          }),
          RefreshVSCodeExtensionStatus: () => Promise.resolve(settings.extensionStatus),
          ReconnectVSCodeExtension: () => Promise.resolve(settings.extensionStatus),
          UpdateGeneralSettings: (input: unknown) => Promise.resolve(input),
          UpdatePrivacySettings: (input: unknown) => Promise.resolve(input),
          UpdateTrackingSettings: (input: unknown) => Promise.resolve(input),
          UpdateExclusionsSettings: (input: unknown) => Promise.resolve(input),
          UpdateExtensionSettings: (input: unknown) => Promise.resolve(input),
          UpdateAppBehaviorSettings: (input: unknown) => Promise.resolve(input),
          ResetSettingsSection: () => Promise.resolve(settings),
          ExportLocalDataToDisk: () => Promise.resolve('/tmp/kairos-export.json'),
          ClearLocalData: () => Promise.resolve(),
        },
      },
    };

    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

test('loads and navigates core desktop routes with mocked bridge data', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/#\/overview$/);

  await page.getByRole('button', { name: 'Analytics' }).click();
  await expect(page.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/#\/analytics$/);

  await page.getByRole('button', { name: 'Sessions' }).click();
  await expect(page.getByRole('heading', { name: 'Sessions', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Session summary' })).toBeVisible();

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
  await expect(page.getByText('Machine display name')).toBeVisible();
});
