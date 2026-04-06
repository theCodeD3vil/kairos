import type { OsPlatform } from '../ingestion/types';

export type GeneralSettings = {
  machineDisplayName: string;
  defaultDateRange: string;
  timeFormat: '12h' | '24h';
  weekStartsOn: 'monday' | 'sunday';
  preferredLandingPage: string;
};

export type PrivacySettings = {
  localOnlyMode: boolean;
  filePathMode: 'full' | 'masked' | 'hidden';
  showMachineNames: boolean;
  showHostname: boolean;
  obfuscateProjectNames: boolean;
  minimizeExtensionMetadata: boolean;
};

export type TrackingSettings = {
  trackingEnabled: boolean;
  idleDetectionEnabled: boolean;
  trackProjectActivity: boolean;
  trackLanguageActivity: boolean;
  trackMachineAttribution: boolean;
  trackSessionBoundaries: boolean;
  idleTimeoutMinutes: number;
  sessionMergeThresholdMinutes: number;
};

export type ExclusionsSettings = {
  folders: string[];
  projectNames: string[];
  workspacePatterns: string[];
  fileExtensions: string[];
  machines: string[];
};

export type ExtensionSettings = {
  autoConnect: boolean;
  sendHeartbeatEvents: boolean;
  heartbeatIntervalSeconds: number;
  sendProjectMetadata: boolean;
  sendLanguageMetadata: boolean;
  sendMachineAttribution: boolean;
  respectDesktopExclusions: boolean;
  bufferEventsWhenOffline: boolean;
  retryConnectionAutomatically: boolean;
  trackOnlyWhenFocused: boolean;
  trackFileOpenEvents: boolean;
  trackSaveEvents: boolean;
  trackEditEvents: boolean;
};

export type ExtensionEffectiveSettings = {
  trackingEnabled: boolean;
  idleDetectionEnabled: boolean;
  idleTimeoutMinutes: number;
  sessionMergeThresholdMinutes: number;
  localOnlyMode: boolean;
  filePathMode: 'full' | 'masked' | 'hidden';
  exclusions: ExclusionsSettings;
  autoConnect: boolean;
  sendHeartbeatEvents: boolean;
  heartbeatIntervalSeconds: number;
  sendProjectMetadata: boolean;
  sendLanguageMetadata: boolean;
  sendMachineAttribution: boolean;
  respectDesktopExclusions: boolean;
  bufferEventsWhenOffline: boolean;
  retryConnectionAutomatically: boolean;
  trackOnlyWhenFocused: boolean;
  trackFileOpenEvents: boolean;
  trackSaveEvents: boolean;
  trackEditEvents: boolean;
};

export type ExtensionStatus = {
  installed: boolean;
  connected: boolean;
  editor: 'vscode';
  extensionVersion?: string;
  lastEventAt?: string;
  lastHandshakeAt?: string;
};

export type SystemInfo = {
  machineId: string;
  machineName: string;
  hostname?: string;
  osPlatform: OsPlatform;
  osVersion?: string;
  arch?: string;
  editor: 'vscode';
  editorVersion?: string;
  appVersion?: string;
  extensionVersion?: string;
  lastSeenAt?: string;
};

export type AppBehaviorSettings = {
  launchOnStartup: boolean;
  startMinimized: boolean;
  minimizeToTray: boolean;
  openOnSystemLogin: boolean;
  rememberLastPage: boolean;
  restoreLastDateRange: boolean;
};

export type DataStorageInfo = {
  localDataPath: string;
  databaseStatus: string;
  lastProcessedAt?: string;
  pendingEventCount?: number;
};

export type AboutInfo = {
  appName: string;
  appVersion: string;
  environment: string;
  buildChannel: string;
  desktopVersion: string;
  extensionVersion?: string;
  licenseSummary: string;
  repositoryUrl?: string;
};

export type SettingsData = {
  general: GeneralSettings;
  privacy: PrivacySettings;
  tracking: TrackingSettings;
  exclusions: ExclusionsSettings;
  extension: ExtensionSettings;
  extensionStatus: ExtensionStatus;
  system: SystemInfo;
  appBehavior: AppBehaviorSettings;
  dataStorage: DataStorageInfo;
  about: AboutInfo;
};
