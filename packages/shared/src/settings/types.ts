import type { ExtensionInfo, MachineInfo, OsPlatform } from '../ingestion/types';

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
  fileMetricsEnabled: boolean;
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
  deepWorkThresholdMinutes: number;
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
  outboxHardCapBytes?: number;
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
  outboxHardCapBytes?: number;
};

export type ExtensionHandshakeRequest = {
  machine: MachineInfo;
  extension: ExtensionInfo;
};

export type ExtensionHandshakeResponse = {
  desktopInstanceId: string;
  protocolVersion: number;
  capabilities: ExtensionCapabilities;
  limits: ExtensionProtocolLimits;
  settings: ExtensionEffectiveSettings;
  settingsVersion: string;
  settingsUpdatedAt: string;
  serverTimestamp: string;
};

export type ExtensionCapabilities = {
  perEventIngestionResults: boolean;
  settingsSnapshotMirror: boolean;
};

export type ExtensionProtocolLimits = {
  maxBatchEvents: number;
  maxRequestBytes: number;
};

export type ExtensionStatus = {
  installed: boolean;
  connected: boolean;
  editor: 'vscode';
  editorVersion?: string;
  extensionVersion?: string;
  lastEventAt?: string;
  lastHandshakeAt?: string;
  pendingEventCount?: number;
  oldestPendingEventAt?: string;
  quarantinedEventCount?: number;
  outboxSizeBytes?: number;
  lastSuccessfulSyncAt?: string;
  desktopInstanceSeen?: string;
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
  status: 'no-data' | 'healthy' | 'buffered' | 'degraded' | 'stale' | string;
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
  reliability: ReliabilityKpiSummary;
};
