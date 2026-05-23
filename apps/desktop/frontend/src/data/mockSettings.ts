import { systemInfoSnapshot } from '@/mocks/system-info';

export type GeneralSettings = {
  machineDisplayName: string;
  defaultDateRange: 'today' | 'week' | 'month' | 'all-time';
  timeFormat: '12h' | '24h';
  themeMode: 'light' | 'dark' | 'system';
  weekStartDay: 'Sunday' | 'Monday';
  landingPage: 'overview' | 'analytics' | 'calendar' | 'sessions';
};

export type PrivacySettings = {
  localOnlyMode: boolean;
  cloudSyncEnabled: boolean;
  filePathVisibility: 'full' | 'masked' | 'hidden';
  showMachineNames: boolean;
  showHostname: boolean;
  obfuscateSensitiveProjects: boolean;
  sensitiveProjectNames: string[];
  minimizeExtensionMetadata: boolean;
  fileMetricsEnabled: boolean;
};

export type TrackingSettings = {
  trackingEnabled: boolean;
  idleDetectionEnabled: boolean;
  trackProjectActivity: boolean;
  trackLanguageActivity: boolean;
  trackMachineAttribution: boolean;
  trackSessionBoundaries: boolean;
  idleTimeoutMinutes: string;
  sessionMergeThresholdMinutes: string;
  deepWorkThresholdMinutes: string;
  detectActiveCodingWindow: boolean;
  backgroundActivityCapture: boolean;
};

export type ExclusionsSettings = {
  folders: string[];
  projectNames: string[];
  workspacePatterns: string[];
  fileExtensions: string[];
  machineNames: string[];
};

export type VscodeExtensionSettings = {
  extensionInstalled: boolean;
  extensionConnected: boolean;
  extensionVersion: string;
  editorDetected: string;
  autoConnectToDesktop: boolean;
  sendHeartbeatEvents: boolean;
  heartbeatIntervalSeconds: string;
  sendProjectMetadata: boolean;
  sendLanguageMetadata: boolean;
  sendMachineAttribution: boolean;
  respectDesktopExclusions: boolean;
  bufferEventsWhenOffline: boolean;
  retryConnectionAutomatically: boolean;
  trackFocusedWindowOnly: boolean;
  trackFileOpenEvents: boolean;
  trackSaveEvents: boolean;
  trackEditActivity: boolean;
  sessionizationOwner: 'desktop' | 'extension';
  lastExtensionSync: string;
  lastExtensionEvent: string;
};

export type AppBehaviorSettings = {
  launchOnStartup: boolean;
  startMinimized: boolean;
  minimizeToTray: boolean;
  openOnSystemLogin: boolean;
  enableMenubar: boolean;
  menubarPreset: 'full' | 'minimal' | 'off' | 'none';
  showMenubarTimeline: boolean;
  showMenubarSession: boolean;
  loginLaunchMode: 'desktop' | 'menubar';
  rememberLastSelectedPage: boolean;
  restoreLastSelectedDateRange: boolean;
  reopenLastViewedContext: boolean;
};

export type DataStorageInfo = {
  localStoragePath: string;
  databaseStatus: 'Healthy' | 'Needs attention';
  lastProcessedTime: string;
  analyticsCacheStatus: string;
  extensionQueueStatus: string;
  pendingEventCount: number;
};

export type ReliabilityStatus = 'no-data' | 'healthy' | 'buffered' | 'degraded' | 'stale' | string;

export type SyncLatencyStats = {
  sampleSize: number;
  medianSeconds: number;
  p90Seconds: number;
};

export type AcceptedEventTrendPoint = {
  date: string;
  acceptedCount: number;
};

export type MachineFreshnessBucket = {
  bucket: 'fresh' | 'stale' | 'dormant' | 'no-activity' | string;
  machineCount: number;
};

export type TrackingCoverageGap = {
  startDate: string;
  endDate: string;
  durationDays: number;
};

export type ReliabilityKpiSummary = {
  status: ReliabilityStatus;
  pendingEventCount: number;
  bufferedTimeWindowMinutes: number;
  oldestPendingEventAt?: string;
  quarantinedEventCount: number;
  runtimeRejectedEventCount: number;
  duplicateEventCount: number;
  duplicateCountAvailable: boolean;
  duplicateEventRate: number;
  rejectedEventRate: number;
  totalAcceptedEvents: number;
  syncLatency: SyncLatencyStats;
  acceptedEventTrend: AcceptedEventTrendPoint[];
  trackingCoverageGaps: TrackingCoverageGap[];
  lastIngestedAt?: string;
  lastSuccessfulSyncAt?: string;
  lastHandshakeAt?: string;
  lastEventAt?: string;
  lastSessionRebuildAt?: string;
  machineFreshness: MachineFreshnessBucket[];
};

export type AboutInfo = {
  appName: string;
  version: string;
  environment: string;
  buildChannel: string;
  desktopAppVersion: string;
  extensionVersion: string;
  licenseSummary: string;
  repositoryLabel: string;
  releaseNotesLabel: string;
};

export type SettingsDefaults = {
  general: GeneralSettings;
  privacy: PrivacySettings;
  tracking: TrackingSettings;
  exclusions: ExclusionsSettings;
  vscodeExtension: VscodeExtensionSettings;
  appBehavior: AppBehaviorSettings;
  dataStorage: DataStorageInfo;
  reliability: ReliabilityKpiSummary;
  about: AboutInfo;
};

export const settingsTabOrder = [
  { label: 'General', value: 'general' },
  { label: 'Privacy', value: 'privacy' },
  { label: 'Tracking', value: 'tracking' },
  { label: 'Exclusions', value: 'exclusions' },
  { label: 'VS Code Extension', value: 'extension' },
  { label: 'Device / System', value: 'system' },
  { label: 'App Behavior', value: 'behavior' },
  { label: 'Menubar', value: 'menubar' },
  { label: 'Data & Storage', value: 'storage' },
  { label: 'About', value: 'about' },
] as const;

export function createEmptyReliabilityKpis(): ReliabilityKpiSummary {
  return {
    status: 'no-data',
    pendingEventCount: 0,
    bufferedTimeWindowMinutes: 0,
    quarantinedEventCount: 0,
    runtimeRejectedEventCount: 0,
    duplicateEventCount: 0,
    duplicateCountAvailable: false,
    duplicateEventRate: 0,
    rejectedEventRate: 0,
    totalAcceptedEvents: 0,
    syncLatency: {
      sampleSize: 0,
      medianSeconds: 0,
      p90Seconds: 0,
    },
    acceptedEventTrend: [],
    trackingCoverageGaps: [],
    machineFreshness: [
      { bucket: 'fresh', machineCount: 0 },
      { bucket: 'stale', machineCount: 0 },
      { bucket: 'dormant', machineCount: 0 },
      { bucket: 'no-activity', machineCount: 0 },
    ],
  };
}

export const settingsDefaults: SettingsDefaults = {
  general: {
    machineDisplayName: "Myke's MacBook Pro",
    defaultDateRange: 'week',
    timeFormat: '24h',
    themeMode: 'light',
    weekStartDay: 'Monday',
    landingPage: 'overview',
  },
  privacy: {
    localOnlyMode: true,
    cloudSyncEnabled: false,
    filePathVisibility: 'masked',
    showMachineNames: true,
    showHostname: false,
    obfuscateSensitiveProjects: false,
    sensitiveProjectNames: [],
    minimizeExtensionMetadata: true,
    fileMetricsEnabled: false,
  },
  tracking: {
    trackingEnabled: true,
    idleDetectionEnabled: true,
    trackProjectActivity: true,
    trackLanguageActivity: true,
    trackMachineAttribution: true,
    trackSessionBoundaries: true,
    idleTimeoutMinutes: '5',
    sessionMergeThresholdMinutes: '10',
    deepWorkThresholdMinutes: '60',
    detectActiveCodingWindow: true,
    backgroundActivityCapture: false,
  },
  exclusions: {
    folders: ['~/Projects/client-sandbox', '~/Downloads'],
    projectNames: [],
    workspacePatterns: ['**/vendor/**', '**/.tmp/**'],
    fileExtensions: ['.env', '.pem', '.key'],
    machineNames: ['Shared Demo Mac'],
  },
  vscodeExtension: {
    extensionInstalled: true,
    extensionConnected: false,
    extensionVersion: systemInfoSnapshot.currentMachine.extensionVersion,
    editorDetected: `${systemInfoSnapshot.currentMachine.editorName} ${systemInfoSnapshot.currentMachine.editorVersion}`,
    autoConnectToDesktop: true,
    sendHeartbeatEvents: true,
    heartbeatIntervalSeconds: '30',
    sendProjectMetadata: true,
    sendLanguageMetadata: true,
    sendMachineAttribution: true,
    respectDesktopExclusions: true,
    bufferEventsWhenOffline: true,
    retryConnectionAutomatically: true,
    trackFocusedWindowOnly: true,
    trackFileOpenEvents: true,
    trackSaveEvents: false,
    trackEditActivity: true,
    sessionizationOwner: 'desktop',
    lastExtensionSync: 'Today 14:27',
    lastExtensionEvent: 'Today 14:26',
  },
  appBehavior: {
    launchOnStartup: false,
    startMinimized: false,
    minimizeToTray: true,
    openOnSystemLogin: false,
    enableMenubar: true,
    menubarPreset: 'none',
    showMenubarTimeline: true,
    showMenubarSession: true,
    loginLaunchMode: 'desktop',
    rememberLastSelectedPage: true,
    restoreLastSelectedDateRange: true,
    reopenLastViewedContext: true,
  },
  dataStorage: {
    localStoragePath: '~/Library/Application Support/Kairos',
    databaseStatus: 'Healthy',
    lastProcessedTime: 'Today 14:28',
    analyticsCacheStatus: 'Warm',
    extensionQueueStatus: 'Buffered',
    pendingEventCount: 12,
  },
  reliability: {
    ...createEmptyReliabilityKpis(),
    status: 'buffered',
    pendingEventCount: 12,
    bufferedTimeWindowMinutes: 24,
    oldestPendingEventAt: '2026-04-07T14:04:00Z',
    totalAcceptedEvents: 842,
    syncLatency: {
      sampleSize: 120,
      medianSeconds: 3,
      p90Seconds: 12,
    },
    acceptedEventTrend: [
      { date: '2026-04-01', acceptedCount: 42 },
      { date: '2026-04-02', acceptedCount: 55 },
      { date: '2026-04-03', acceptedCount: 37 },
      { date: '2026-04-04', acceptedCount: 61 },
      { date: '2026-04-05', acceptedCount: 48 },
      { date: '2026-04-06', acceptedCount: 67 },
      { date: '2026-04-07', acceptedCount: 54 },
    ],
    machineFreshness: [
      { bucket: 'fresh', machineCount: 1 },
      { bucket: 'stale', machineCount: 0 },
      { bucket: 'dormant', machineCount: 0 },
      { bucket: 'no-activity', machineCount: 0 },
    ],
  },
  about: {
    appName: 'Kairos',
    version: '0.16.0',
    environment: 'Desktop',
    buildChannel: 'Local',
    desktopAppVersion: systemInfoSnapshot.appStatus.appVersion,
    extensionVersion: systemInfoSnapshot.currentMachine.extensionVersion,
    licenseSummary: 'License metadata unavailable',
    repositoryLabel: 'Not configured',
    releaseNotesLabel: 'Not configured',
  },
};
