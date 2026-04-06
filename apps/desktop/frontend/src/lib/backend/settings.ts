import {
  GetSettingsData,
  ResetSettingsSection,
  UpdateAppBehaviorSettings,
  UpdateExclusionsSettings,
  UpdateExtensionSettings,
  UpdateGeneralSettings,
  UpdatePrivacySettings,
  UpdateTrackingSettings,
} from '../../../wailsjs/go/main/App';
import type { contracts } from '../../../wailsjs/go/models';
import type {
  AboutInfo,
  AppBehaviorSettings,
  DataStorageInfo,
  ExclusionsSettings,
  GeneralSettings,
  PrivacySettings,
  SettingsDefaults,
  TrackingSettings,
  VscodeExtensionSettings,
} from '@/data/mockSettings';
import type { AppStatus, MachineInfo } from '@/mocks/system-info';

export const settingsSections = {
  general: 'general',
  privacy: 'privacy',
  tracking: 'tracking',
  exclusions: 'exclusions',
  extension: 'extension',
  appBehavior: 'appBehavior',
} as const;

export type SettingsScreenData = {
  viewModel: SettingsDefaults;
  currentMachine: MachineInfo;
  appStatus: AppStatus;
};

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

function toDatabaseStatus(status: string): DataStorageInfo['databaseStatus'] {
  return status === 'ready' ? 'Healthy' : 'Needs attention';
}

function toGeneral(input: contracts.GeneralSettings): GeneralSettings {
  return {
    machineDisplayName: input.machineDisplayName,
    defaultDateRange: input.defaultDateRange as GeneralSettings['defaultDateRange'],
    timeFormat: input.timeFormat as GeneralSettings['timeFormat'],
    weekStartDay: input.weekStartsOn === 'sunday' ? 'Sunday' : 'Monday',
    landingPage: input.preferredLandingPage as GeneralSettings['landingPage'],
  };
}

function toPrivacy(input: contracts.PrivacySettings): PrivacySettings {
  return {
    localOnlyMode: input.localOnlyMode,
    cloudSyncEnabled: false,
    filePathVisibility: input.filePathMode as PrivacySettings['filePathVisibility'],
    showMachineNames: input.showMachineNames,
    showHostname: input.showHostname,
    obfuscateSensitiveProjects: input.obfuscateProjectNames,
    minimizeExtensionMetadata: input.minimizeExtensionMetadata,
  };
}

function toTracking(input: contracts.TrackingSettings): TrackingSettings {
  return {
    trackingEnabled: input.trackingEnabled,
    idleDetectionEnabled: input.idleDetectionEnabled,
    trackProjectActivity: input.trackProjectActivity,
    trackLanguageActivity: input.trackLanguageActivity,
    trackMachineAttribution: input.trackMachineAttribution,
    trackSessionBoundaries: input.trackSessionBoundaries,
    idleTimeoutMinutes: String(input.idleTimeoutMinutes),
    sessionMergeThresholdMinutes: String(input.sessionMergeThresholdMinutes),
    detectActiveCodingWindow: false,
    backgroundActivityCapture: false,
  };
}

function toExclusions(input: contracts.ExclusionsSettings): ExclusionsSettings {
  return {
    folders: input.folders,
    projectNames: input.projectNames,
    workspacePatterns: input.workspacePatterns,
    fileExtensions: input.fileExtensions,
    machineNames: input.machines,
  };
}

function toVscodeExtension(input: Pick<contracts.SettingsData, 'extension' | 'extensionStatus' | 'system'>): VscodeExtensionSettings {
  return {
    extensionInstalled: input.extensionStatus.installed,
    extensionConnected: input.extensionStatus.connected,
    extensionVersion: input.extensionStatus.extensionVersion ?? input.system.extensionVersion ?? '—',
    editorDetected: `VS Code ${input.system.editorVersion ?? ''}`.trim(),
    autoConnectToDesktop: input.extension.autoConnect,
    sendHeartbeatEvents: input.extension.sendHeartbeatEvents,
    heartbeatIntervalSeconds: String(input.extension.heartbeatIntervalSeconds),
    sendProjectMetadata: input.extension.sendProjectMetadata,
    sendLanguageMetadata: input.extension.sendLanguageMetadata,
    sendMachineAttribution: input.extension.sendMachineAttribution,
    respectDesktopExclusions: input.extension.respectDesktopExclusions,
    bufferEventsWhenOffline: input.extension.bufferEventsWhenOffline,
    retryConnectionAutomatically: input.extension.retryConnectionAutomatically,
    trackFocusedWindowOnly: input.extension.trackOnlyWhenFocused,
    trackFileOpenEvents: input.extension.trackFileOpenEvents,
    trackSaveEvents: input.extension.trackSaveEvents,
    trackEditActivity: input.extension.trackEditEvents,
    sessionizationOwner: 'desktop',
    lastExtensionSync: formatDateTime(input.extensionStatus.lastHandshakeAt),
    lastExtensionEvent: formatDateTime(input.extensionStatus.lastEventAt),
  };
}

function toAppBehavior(input: contracts.AppBehaviorSettings): AppBehaviorSettings {
  return {
    launchOnStartup: input.launchOnStartup,
    startMinimized: input.startMinimized,
    minimizeToTray: input.minimizeToTray,
    openOnSystemLogin: input.openOnSystemLogin,
    rememberLastSelectedPage: input.rememberLastPage,
    restoreLastSelectedDateRange: input.restoreLastDateRange,
    reopenLastViewedContext: false,
  };
}

function toDataStorage(input: contracts.SettingsData): DataStorageInfo {
  return {
    localStoragePath: input.dataStorage.localDataPath,
    databaseStatus: toDatabaseStatus(input.dataStorage.databaseStatus),
    lastProcessedTime: formatDateTime(input.dataStorage.lastProcessedAt),
    analyticsCacheStatus: 'Not implemented',
    extensionQueueStatus: input.extensionStatus.connected ? 'Connected' : 'Idle',
    pendingEventCount: input.dataStorage.pendingEventCount ?? 0,
  };
}

function toAbout(input: contracts.SettingsData): AboutInfo {
  return {
    appName: input.about.appName,
    version: input.about.appVersion,
    environment: input.about.environment,
    buildChannel: input.about.buildChannel,
    desktopAppVersion: input.about.desktopVersion,
    extensionVersion: input.about.extensionVersion ?? '—',
    licenseSummary: input.about.licenseSummary,
    repositoryLabel: input.about.repositoryUrl ?? 'Not configured',
    releaseNotesLabel: 'Not wired yet',
  };
}

export function adaptSettingsData(input: contracts.SettingsData): SettingsDefaults {
  return {
    general: toGeneral(input.general),
    privacy: toPrivacy(input.privacy),
    tracking: toTracking(input.tracking),
    exclusions: toExclusions(input.exclusions),
    vscodeExtension: toVscodeExtension(input),
    appBehavior: toAppBehavior(input.appBehavior),
    dataStorage: toDataStorage(input),
    about: toAbout(input),
  };
}

function toCurrentMachine(input: contracts.SettingsData): MachineInfo {
  return {
    machineName: input.system.machineName,
    machineId: input.system.machineId,
    hostname: input.system.hostname ?? '—',
    os: input.system.osPlatform,
    osVersion: input.system.osVersion ?? '—',
    architecture: input.system.arch ?? '—',
    editorName: input.system.editor === 'vscode' ? 'VS Code' : input.system.editor,
    editorVersion: input.system.editorVersion ?? '—',
    extensionVersion: input.extensionStatus.extensionVersion ?? input.system.extensionVersion ?? '—',
    lastSeenAt: formatDateTime(input.system.lastSeenAt),
  };
}

function toAppStatus(input: contracts.SettingsData): AppStatus {
  return {
    appVersion: input.about.desktopVersion,
    trackingEnabled: input.tracking.trackingEnabled,
    localOnlyMode: input.privacy.localOnlyMode,
    lastUpdatedAt: formatDateTime(input.dataStorage.lastProcessedAt),
  };
}

function adaptSettingsScreenData(input: contracts.SettingsData): SettingsScreenData {
  return {
    viewModel: adaptSettingsData(input),
    currentMachine: toCurrentMachine(input),
    appStatus: toAppStatus(input),
  };
}

export async function loadSettingsScreenData(): Promise<SettingsScreenData> {
  const data = await GetSettingsData();
  return adaptSettingsScreenData(data);
}

export async function saveGeneralSettings(input: GeneralSettings): Promise<GeneralSettings> {
  const updated = await UpdateGeneralSettings({
    machineDisplayName: input.machineDisplayName,
    defaultDateRange: input.defaultDateRange,
    timeFormat: input.timeFormat,
    weekStartsOn: input.weekStartDay === 'Sunday' ? 'sunday' : 'monday',
    preferredLandingPage: input.landingPage,
  });
  return toGeneral(updated);
}

export async function savePrivacySettings(input: PrivacySettings): Promise<PrivacySettings> {
  const updated = await UpdatePrivacySettings({
    localOnlyMode: input.localOnlyMode,
    filePathMode: input.filePathVisibility,
    showMachineNames: input.showMachineNames,
    showHostname: input.showHostname,
    obfuscateProjectNames: input.obfuscateSensitiveProjects,
    minimizeExtensionMetadata: input.minimizeExtensionMetadata,
  });
  return toPrivacy(updated);
}

export async function saveTrackingSettings(input: TrackingSettings): Promise<TrackingSettings> {
  const updated = await UpdateTrackingSettings({
    trackingEnabled: input.trackingEnabled,
    idleDetectionEnabled: input.idleDetectionEnabled,
    trackProjectActivity: input.trackProjectActivity,
    trackLanguageActivity: input.trackLanguageActivity,
    trackMachineAttribution: input.trackMachineAttribution,
    trackSessionBoundaries: input.trackSessionBoundaries,
    idleTimeoutMinutes: Number.parseInt(input.idleTimeoutMinutes, 10) || 0,
    sessionMergeThresholdMinutes: Number.parseInt(input.sessionMergeThresholdMinutes, 10) || 0,
  });
  return toTracking(updated);
}

export async function saveExclusionsSettings(input: ExclusionsSettings): Promise<ExclusionsSettings> {
  const updated = await UpdateExclusionsSettings({
    folders: input.folders,
    projectNames: input.projectNames,
    workspacePatterns: input.workspacePatterns,
    fileExtensions: input.fileExtensions,
    machines: input.machineNames,
  });
  return toExclusions(updated);
}

export async function saveExtensionSettings(input: VscodeExtensionSettings): Promise<VscodeExtensionSettings> {
  const updated = await UpdateExtensionSettings({
    autoConnect: input.autoConnectToDesktop,
    sendHeartbeatEvents: input.sendHeartbeatEvents,
    heartbeatIntervalSeconds: Number.parseInt(input.heartbeatIntervalSeconds, 10) || 0,
    sendProjectMetadata: input.sendProjectMetadata,
    sendLanguageMetadata: input.sendLanguageMetadata,
    sendMachineAttribution: input.sendMachineAttribution,
    respectDesktopExclusions: input.respectDesktopExclusions,
    bufferEventsWhenOffline: input.bufferEventsWhenOffline,
    retryConnectionAutomatically: input.retryConnectionAutomatically,
    trackOnlyWhenFocused: input.trackFocusedWindowOnly,
    trackFileOpenEvents: input.trackFileOpenEvents,
    trackSaveEvents: input.trackSaveEvents,
    trackEditEvents: input.trackEditActivity,
  });

  const data = await GetSettingsData();
  return toVscodeExtension({
    ...data,
    extension: updated,
  });
}

export async function saveAppBehaviorSettings(input: AppBehaviorSettings): Promise<AppBehaviorSettings> {
  const updated = await UpdateAppBehaviorSettings({
    launchOnStartup: input.launchOnStartup,
    startMinimized: input.startMinimized,
    minimizeToTray: input.minimizeToTray,
    openOnSystemLogin: input.openOnSystemLogin,
    rememberLastPage: input.rememberLastSelectedPage,
    restoreLastDateRange: input.restoreLastSelectedDateRange,
  });
  return toAppBehavior(updated);
}

export async function resetSettingsSectionViewModel(section: string): Promise<SettingsScreenData> {
  const data = await ResetSettingsSection(section);
  return adaptSettingsScreenData(data);
}
