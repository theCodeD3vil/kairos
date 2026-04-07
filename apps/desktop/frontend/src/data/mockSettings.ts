import { systemInfoSnapshot } from '@/mocks/system-info';

export type GeneralSettings = {
  machineDisplayName: string;
  defaultDateRange: 'today' | 'week' | 'month' | 'custom';
  timeFormat: '12h' | '24h';
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
  { label: 'Data & Storage', value: 'storage' },
  { label: 'About', value: 'about' },
] as const;

export const settingsDefaults: SettingsDefaults = {
  general: {
    machineDisplayName: "Myke's MacBook Pro",
    defaultDateRange: 'week',
    timeFormat: '24h',
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
