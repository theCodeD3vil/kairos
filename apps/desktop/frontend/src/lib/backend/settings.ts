import {
  GetSettingsData,
  GetVSCodeBridgeHealth,
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
import {
  readReopenLastViewedContextPreference,
  saveReopenLastViewedContextPreference,
} from '@/lib/settings/preferences';
import { trackSyncOperation } from '@/lib/sync-status';

type LoadSettingsOptions = {
  quiet?: boolean;
};

export type AutostartRegistrationStatus = {
  enabled: boolean;
  platform: string;
  mechanism: string;
  location: string;
};

export type DesktopUpdateStatus = {
  checkedAt: string;
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseUrl: string;
  assetUrl: string;
  releaseNotes: string;
  preRelease: boolean;
  error?: string;
};

function callAppBridgeMethod<T>(methodName: 'RefreshVSCodeExtensionStatus' | 'ReconnectVSCodeExtension'): Promise<T> {
  const candidate = (window as unknown as {
    go?: { main?: { App?: Record<string, unknown> } };
  }).go?.main?.App?.[methodName];

  if (typeof candidate !== 'function') {
    throw new Error(`Desktop bridge "${methodName}" is unavailable. Restart Kairos Desktop and try again.`);
  }

  return (candidate as () => Promise<T>)();
}

function callAutostartStatusMethod(): Promise<AutostartRegistrationStatus> {
  const candidate = (window as unknown as {
    go?: { main?: { App?: Record<string, unknown> } };
  }).go?.main?.App?.GetAutostartRegistrationStatus;

  if (typeof candidate !== 'function') {
    throw new Error('Desktop bridge "GetAutostartRegistrationStatus" is unavailable. Restart Kairos Desktop and try again.');
  }

  return (candidate as () => Promise<AutostartRegistrationStatus>)();
}

function callDesktopUpdateCheckMethod(): Promise<DesktopUpdateStatus> {
  const candidate = (window as unknown as {
    go?: { main?: { App?: Record<string, unknown> } };
  }).go?.main?.App?.CheckForDesktopUpdate;

  if (typeof candidate !== 'function') {
    throw new Error('Desktop bridge "CheckForDesktopUpdate" is unavailable. Restart Kairos Desktop and try again.');
  }

  return (candidate as () => Promise<DesktopUpdateStatus>)();
}

function callBridgeHealthMethod(): Promise<boolean> {
  const candidate = (window as unknown as {
    go?: { main?: { App?: Record<string, unknown> } };
  }).go?.main?.App?.GetVSCodeBridgeHealth;

  if (typeof candidate !== 'function') {
    throw new Error('Desktop bridge "GetVSCodeBridgeHealth" is unavailable. Restart Kairos Desktop and try again.');
  }

  return (candidate as () => Promise<boolean>)();
}

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

function emptyViewModel(): SettingsDefaults {
  return {
    general: {
      machineDisplayName: 'Kairos',
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
      minimizeExtensionMetadata: false,
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
      detectActiveCodingWindow: false,
      backgroundActivityCapture: false,
    },
    exclusions: {
      folders: [],
      projectNames: [],
      workspacePatterns: [],
      fileExtensions: [],
      machineNames: [],
    },
    vscodeExtension: {
      extensionInstalled: false,
      extensionConnected: false,
      extensionVersion: '—',
      editorDetected: 'VS Code',
      autoConnectToDesktop: true,
      sendHeartbeatEvents: true,
      heartbeatIntervalSeconds: '30',
      sendProjectMetadata: true,
      sendLanguageMetadata: true,
      sendMachineAttribution: true,
      respectDesktopExclusions: true,
      bufferEventsWhenOffline: true,
      retryConnectionAutomatically: true,
      trackFocusedWindowOnly: false,
      trackFileOpenEvents: true,
      trackSaveEvents: true,
      trackEditActivity: true,
      sessionizationOwner: 'desktop',
      lastExtensionSync: '—',
      lastExtensionEvent: '—',
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
      reopenLastViewedContext: readReopenLastViewedContextPreference(true),
    },
    dataStorage: {
      localStoragePath: '—',
      databaseStatus: 'Needs attention',
      lastProcessedTime: '—',
      analyticsCacheStatus: 'Derived on demand',
      extensionQueueStatus: 'Unknown',
      pendingEventCount: 0,
    },
    about: {
      appName: 'Kairos',
      version: '0.0.0',
      environment: 'desktop',
      buildChannel: 'local',
      desktopAppVersion: '0.0.0',
      extensionVersion: '—',
      licenseSummary: 'Unspecified',
      repositoryLabel: 'Not configured',
      releaseNotesLabel: 'Not configured',
    },
  };
}

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

function normalizeGeneralDefaultDateRange(value: string): GeneralSettings['defaultDateRange'] {
  switch (value) {
    case 'today':
      return 'today';
    case 'month':
    case 'last-30-days':
      return 'month';
    case 'week':
    case 'last-7-days':
    default:
      return 'week';
  }
}

function toGeneral(input: contracts.GeneralSettings): GeneralSettings {
  return {
    machineDisplayName: input.machineDisplayName,
    defaultDateRange: normalizeGeneralDefaultDateRange(input.defaultDateRange),
    timeFormat: input.timeFormat as GeneralSettings['timeFormat'],
    themeMode: (input.themeMode as GeneralSettings['themeMode']) || 'light',
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
    sensitiveProjectNames: input.sensitiveProjectNames ?? [],
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
    enableMenubar: input.enableMenubar,
    menubarPreset: input.menubarPreset === 'full' || input.menubarPreset === 'minimal' || input.menubarPreset === 'off'
      ? input.menubarPreset
      : 'none',
    showMenubarTimeline: input.showMenubarTimeline,
    showMenubarSession: input.showMenubarSession,
    loginLaunchMode: input.loginLaunchMode === 'menubar' ? 'menubar' : 'desktop',
    rememberLastSelectedPage: input.rememberLastPage,
    restoreLastSelectedDateRange: input.restoreLastDateRange,
    reopenLastViewedContext: readReopenLastViewedContextPreference(true),
  };
}

function toDataStorage(input: contracts.SettingsData): DataStorageInfo {
  return {
    localStoragePath: input.dataStorage.localDataPath,
    databaseStatus: toDatabaseStatus(input.dataStorage.databaseStatus),
    lastProcessedTime: formatDateTime(input.dataStorage.lastProcessedAt),
    analyticsCacheStatus: 'Derived on demand',
    extensionQueueStatus: input.extensionStatus.connected ? 'Connected' : 'No desktop-side queue',
    pendingEventCount: input.dataStorage.pendingEventCount ?? 0,
  };
}

function toAbout(input: contracts.SettingsData): AboutInfo {
  const releaseNotes = input.about.repositoryUrl ? `${input.about.repositoryUrl.replace(/\/$/, '')}/releases` : 'Not configured';

  return {
    appName: input.about.appName,
    version: input.about.appVersion,
    environment: input.about.environment,
    buildChannel: input.about.buildChannel,
    desktopAppVersion: input.about.desktopVersion,
    extensionVersion: input.about.extensionVersion ?? '—',
    licenseSummary: input.about.licenseSummary,
    repositoryLabel: input.about.repositoryUrl ?? 'Not configured',
    releaseNotesLabel: releaseNotes,
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

export function emptySettingsScreenData(): SettingsScreenData {
  return {
    viewModel: emptyViewModel(),
    currentMachine: {
      machineName: 'Kairos',
      machineId: 'unknown-machine',
      hostname: '—',
      os: 'Unknown OS',
      osVersion: '—',
      architecture: '—',
      editorName: 'VS Code',
      editorVersion: '—',
      extensionVersion: '—',
      lastSeenAt: '—',
    },
    appStatus: {
      appVersion: '0.0.0',
      trackingEnabled: true,
      localOnlyMode: true,
      lastUpdatedAt: '—',
    },
  };
}

export async function loadSettingsScreenData(options: LoadSettingsOptions = {}): Promise<SettingsScreenData> {
  const operation = async () => {
    const data = await GetSettingsData();
    return adaptSettingsScreenData(data);
  };

  if (options.quiet !== false) {
    return operation();
  }

  return trackSyncOperation(operation, {
    inProgressMessage: 'Syncing settings',
    successMessage: 'Settings synced',
    errorMessage: 'Settings sync failed',
  });
}

export async function saveGeneralSettings(input: GeneralSettings): Promise<GeneralSettings> {
  return trackSyncOperation(
    async () => {
      const updated = await UpdateGeneralSettings({
        machineDisplayName: input.machineDisplayName,
        defaultDateRange: input.defaultDateRange,
        timeFormat: input.timeFormat,
        themeMode: input.themeMode,
        weekStartsOn: input.weekStartDay === 'Sunday' ? 'sunday' : 'monday',
        preferredLandingPage: input.landingPage,
      });
      return toGeneral(updated);
    },
    {
      inProgressMessage: 'Saving general settings',
      successMessage: 'General settings saved',
      errorMessage: 'Saving general settings failed',
    },
  );
}

export async function savePrivacySettings(input: PrivacySettings): Promise<PrivacySettings> {
  return trackSyncOperation(
    async () => {
      const updated = await UpdatePrivacySettings({
        localOnlyMode: input.localOnlyMode,
        filePathMode: input.filePathVisibility,
        showMachineNames: input.showMachineNames,
        showHostname: input.showHostname,
        obfuscateProjectNames: input.obfuscateSensitiveProjects,
        sensitiveProjectNames: input.sensitiveProjectNames,
        minimizeExtensionMetadata: input.minimizeExtensionMetadata,
      });
      return toPrivacy(updated);
    },
    {
      inProgressMessage: 'Saving privacy settings',
      successMessage: 'Privacy settings saved',
      errorMessage: 'Saving privacy settings failed',
    },
  );
}

export async function saveTrackingSettings(input: TrackingSettings): Promise<TrackingSettings> {
  return trackSyncOperation(
    async () => {
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
    },
    {
      inProgressMessage: 'Saving tracking settings',
      successMessage: 'Tracking settings saved',
      errorMessage: 'Saving tracking settings failed',
    },
  );
}

export async function saveExclusionsSettings(input: ExclusionsSettings): Promise<ExclusionsSettings> {
  return trackSyncOperation(
    async () => {
      const updated = await UpdateExclusionsSettings({
        folders: input.folders,
        projectNames: input.projectNames,
        workspacePatterns: input.workspacePatterns,
        fileExtensions: input.fileExtensions,
        machines: input.machineNames,
      });
      return toExclusions(updated);
    },
    {
      inProgressMessage: 'Saving exclusions',
      successMessage: 'Exclusions saved',
      errorMessage: 'Saving exclusions failed',
    },
  );
}

export async function saveExtensionSettings(input: VscodeExtensionSettings): Promise<VscodeExtensionSettings> {
  return trackSyncOperation(
    async () => {
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
    },
    {
      inProgressMessage: 'Saving extension settings',
      successMessage: 'Extension settings saved',
      errorMessage: 'Saving extension settings failed',
    },
  );
}

export async function saveAppBehaviorSettings(input: AppBehaviorSettings): Promise<AppBehaviorSettings> {
  return trackSyncOperation(
    async () => {
      const updated = await UpdateAppBehaviorSettings({
        launchOnStartup: input.launchOnStartup,
        startMinimized: input.startMinimized,
        minimizeToTray: input.minimizeToTray,
        openOnSystemLogin: input.openOnSystemLogin,
        enableMenubar: input.enableMenubar,
        menubarPreset: input.menubarPreset,
        showMenubarTimeline: input.showMenubarTimeline,
        showMenubarSession: input.showMenubarSession,
        loginLaunchMode: input.loginLaunchMode,
        rememberLastPage: input.rememberLastSelectedPage,
        restoreLastDateRange: input.restoreLastSelectedDateRange,
      });
      saveReopenLastViewedContextPreference(input.reopenLastViewedContext);
      return toAppBehavior(updated);
    },
    {
      inProgressMessage: 'Saving app behavior',
      successMessage: 'App behavior saved',
      errorMessage: 'Saving app behavior failed',
    },
  );
}

export async function resetSettingsSectionViewModel(section: string): Promise<SettingsScreenData> {
  return trackSyncOperation(
    async () => {
      if (section === settingsSections.appBehavior) {
        saveReopenLastViewedContextPreference(true);
      }
      const data = await ResetSettingsSection(section);
      return adaptSettingsScreenData(data);
    },
    {
      inProgressMessage: 'Resetting settings',
      successMessage: 'Settings reset',
      errorMessage: 'Settings reset failed',
    },
  );
}

export async function refreshVSCodeExtensionStatus(): Promise<contracts.ExtensionStatus> {
  return trackSyncOperation(
    async () => callAppBridgeMethod<contracts.ExtensionStatus>('RefreshVSCodeExtensionStatus'),
    {
      inProgressMessage: 'Refreshing VS Code status',
      successMessage: 'VS Code status refreshed',
      errorMessage: 'Refreshing VS Code status failed',
    },
  );
}

export async function reconnectVSCodeExtension(): Promise<contracts.ExtensionStatus> {
  return trackSyncOperation(
    async () => callAppBridgeMethod<contracts.ExtensionStatus>('ReconnectVSCodeExtension'),
    {
      inProgressMessage: 'Reconnecting VS Code extension',
      successMessage: 'Reconnect command sent',
      errorMessage: 'Reconnecting VS Code extension failed',
    },
  );
}

export async function probeVSCodeExtensionStatus(): Promise<contracts.ExtensionStatus | null> {
  try {
    return await callAppBridgeMethod<contracts.ExtensionStatus>('RefreshVSCodeExtensionStatus');
  } catch {
    return null;
  }
}

export async function getVSCodeBridgeReachability(): Promise<boolean> {
  try {
    return await callBridgeHealthMethod();
  } catch {
    try {
      return await GetVSCodeBridgeHealth();
    } catch {
      return false;
    }
  }
}

export async function getAutostartRegistrationStatus(): Promise<AutostartRegistrationStatus | null> {
  try {
    return await callAutostartStatusMethod();
  } catch {
    return null;
  }
}

export async function checkDesktopUpdate(): Promise<DesktopUpdateStatus | null> {
  try {
    return await callDesktopUpdateCheckMethod();
  } catch {
    return null;
  }
}
