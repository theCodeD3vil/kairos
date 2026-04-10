import type { ExtensionEffectiveSettings } from '@kairos/shared/settings';

import { DEFAULT_HEARTBEAT_INTERVAL_SECONDS } from '../constants';

export const DEFAULT_EFFECTIVE_SETTINGS: ExtensionEffectiveSettings = {
  trackingEnabled: true,
  idleDetectionEnabled: true,
  idleTimeoutMinutes: 15,
  sessionMergeThresholdMinutes: 5,
  localOnlyMode: true,
  filePathMode: 'masked',
  exclusions: {
    folders: [],
    projectNames: [],
    workspacePatterns: [],
    fileExtensions: [],
    machines: [],
  },
  autoConnect: true,
  sendHeartbeatEvents: false,
  heartbeatIntervalSeconds: DEFAULT_HEARTBEAT_INTERVAL_SECONDS,
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
  outboxHardCapBytes: undefined,
};

export function cloneDefaultEffectiveSettings(): ExtensionEffectiveSettings {
  return {
    ...DEFAULT_EFFECTIVE_SETTINGS,
    exclusions: {
      ...DEFAULT_EFFECTIVE_SETTINGS.exclusions,
    },
  };
}
