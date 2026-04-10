import path from 'node:path';

import type { ActivityEvent, ActivityEventType, MachineInfo } from '@kairos/shared/ingestion';
import type { ExclusionsSettings, ExtensionEffectiveSettings } from '@kairos/shared/settings';

import {
  MAX_ARCH_LENGTH,
  MAX_EDITOR_VERSION_LENGTH,
  MAX_EVENT_ID_LENGTH,
  MAX_EXTENSION_VERSION_LENGTH,
  MAX_FILE_PATH_LENGTH,
  MAX_GIT_BRANCH_LENGTH,
  MAX_HOSTNAME_LENGTH,
  MAX_LANGUAGE_LENGTH,
  MAX_MACHINE_ID_LENGTH,
  MAX_MACHINE_NAME_LENGTH,
  MAX_OS_PLATFORM_LENGTH,
  MAX_OS_VERSION_LENGTH,
  MAX_PROJECT_NAME_LENGTH,
  MAX_WORKSPACE_ID_LENGTH,
  REDACTED_LANGUAGE,
  REDACTED_PROJECT_NAME,
  REDACTED_WORKSPACE_ID,
} from './constants';
import {
  cloneDefaultEffectiveSettings,
  DEFAULT_EFFECTIVE_SETTINGS,
} from './settings/defaults';
import type { EditorContext } from './types';

export type GateDecision = {
  allowed: boolean;
  reason?: string;
};

const NON_CODING_LANGUAGE_IDS = new Set(['scminput']);

export function getDefaultEffectiveSettings(): ExtensionEffectiveSettings {
  return cloneDefaultEffectiveSettings();
}

export function sanitizeEffectiveSettings(settings?: ExtensionEffectiveSettings): ExtensionEffectiveSettings {
  if (!settings) {
    return getDefaultEffectiveSettings();
  }

  return {
    trackingEnabled: settings.trackingEnabled,
    idleDetectionEnabled: settings.idleDetectionEnabled,
    idleTimeoutMinutes: clampNumber(settings.idleTimeoutMinutes, 1, 180, DEFAULT_EFFECTIVE_SETTINGS.idleTimeoutMinutes),
    sessionMergeThresholdMinutes: clampNumber(
      settings.sessionMergeThresholdMinutes,
      0,
      180,
      DEFAULT_EFFECTIVE_SETTINGS.sessionMergeThresholdMinutes,
    ),
    localOnlyMode: settings.localOnlyMode,
    filePathMode: settings.filePathMode,
    exclusions: sanitizeExclusions(settings.exclusions),
    autoConnect: settings.autoConnect,
    sendHeartbeatEvents: settings.sendHeartbeatEvents,
    heartbeatIntervalSeconds: sanitizePositiveInteger(
      settings.heartbeatIntervalSeconds,
      DEFAULT_EFFECTIVE_SETTINGS.heartbeatIntervalSeconds,
    ),
    sendProjectMetadata: settings.sendProjectMetadata,
    sendLanguageMetadata: settings.sendLanguageMetadata,
    sendMachineAttribution: settings.sendMachineAttribution,
    respectDesktopExclusions: settings.respectDesktopExclusions,
    bufferEventsWhenOffline: settings.bufferEventsWhenOffline,
    retryConnectionAutomatically: settings.retryConnectionAutomatically,
    trackOnlyWhenFocused: settings.trackOnlyWhenFocused,
    trackFileOpenEvents: settings.trackFileOpenEvents,
    trackSaveEvents: settings.trackSaveEvents,
    trackEditEvents: settings.trackEditEvents,
    outboxHardCapBytes: sanitizeOptionalPositiveInteger(settings.outboxHardCapBytes),
  };
}

export function sanitizeMachine(machine: MachineInfo, sendMachineAttribution: boolean): MachineInfo {
  const machineId = clampRequired(machine.machineId, MAX_MACHINE_ID_LENGTH, 'machine');
  const machineName = clampRequired(machine.machineName || machineId, MAX_MACHINE_NAME_LENGTH, 'machine');

  return {
    machineId,
    machineName,
    osPlatform: clampRequired(machine.osPlatform, MAX_OS_PLATFORM_LENGTH, 'machine'),
    hostname: sendMachineAttribution ? clampOptional(machine.hostname, MAX_HOSTNAME_LENGTH) : undefined,
    osVersion: sendMachineAttribution ? clampOptional(machine.osVersion, MAX_OS_VERSION_LENGTH) : undefined,
    arch: sendMachineAttribution ? clampOptional(machine.arch, MAX_ARCH_LENGTH) : undefined,
  };
}

export function sanitizeEditorContext(context: EditorContext): EditorContext {
  return {
    workspaceId: clampRequired(context.workspaceId, MAX_WORKSPACE_ID_LENGTH, 'workspace'),
    projectName: clampRequired(context.projectName, MAX_PROJECT_NAME_LENGTH, 'project'),
    language: clampRequired(context.language, MAX_LANGUAGE_LENGTH, 'language'),
    filePath: clampOptional(context.filePath, MAX_FILE_PATH_LENGTH),
    gitBranch: clampOptional(context.gitBranch, MAX_GIT_BRANCH_LENGTH),
  };
}

export function shouldEmitEvent(
  eventType: ActivityEventType,
  settings: ExtensionEffectiveSettings,
  focused: boolean,
): GateDecision {
  if (!settings.trackingEnabled) {
    return { allowed: false, reason: 'tracking disabled by desktop settings' };
  }

  switch (eventType) {
    case 'heartbeat':
      return { allowed: false, reason: 'heartbeat events are disabled in edit-driven mode' };
    case 'open':
      return { allowed: false, reason: 'open events are disabled in edit-driven mode' };
    case 'save':
      return { allowed: false, reason: 'save events are disabled in edit-driven mode' };
    case 'edit':
      if (!settings.trackEditEvents) {
        return { allowed: false, reason: 'edit events disabled by desktop settings' };
      }
      break;
    default:
      break;
  }

  if (settings.trackOnlyWhenFocused && !focused && eventType !== 'focus' && eventType !== 'blur') {
    return { allowed: false, reason: 'window is unfocused and focused-only tracking is enabled' };
  }

  return { allowed: true };
}

export function isCodingContext(context: EditorContext): boolean {
  if (!context.filePath?.trim()) {
    return false;
  }

  return !NON_CODING_LANGUAGE_IDS.has(context.language.trim().toLowerCase());
}

export function isExcludedContext(context: EditorContext, machine: MachineInfo, exclusions: ExclusionsSettings): boolean {
  const projectName = context.projectName.trim().toLowerCase();
  for (const excludedProject of exclusions.projectNames) {
    if (excludedProject.trim().toLowerCase() === projectName) {
      return true;
    }
  }

  const machineId = machine.machineId.trim().toLowerCase();
  const machineName = machine.machineName.trim().toLowerCase();
  for (const candidate of exclusions.machines) {
    const normalized = candidate.trim().toLowerCase();
    if (normalized !== '' && (normalized === machineId || normalized === machineName)) {
      return true;
    }
  }

  if (context.filePath) {
    const lowerPath = context.filePath.toLowerCase();
    for (const folder of exclusions.folders) {
      const normalized = folder.trim().toLowerCase();
      if (normalized !== '' && lowerPath.includes(normalized)) {
        return true;
      }
    }
    for (const extension of exclusions.fileExtensions) {
      const normalized = extension.trim().toLowerCase();
      if (normalized !== '' && lowerPath.endsWith(normalized)) {
        return true;
      }
    }
  }

  for (const pattern of exclusions.workspacePatterns) {
    const normalized = pattern.trim();
    if (normalized !== '' && matchWorkspacePattern(normalized, context.workspaceId)) {
      return true;
    }
  }

  return false;
}

export function shapeContextForEmission(
  context: EditorContext,
  settings: ExtensionEffectiveSettings,
): EditorContext {
  const shaped: EditorContext = {
    workspaceId: settings.sendProjectMetadata ? context.workspaceId : REDACTED_WORKSPACE_ID,
    projectName: settings.sendProjectMetadata ? context.projectName : REDACTED_PROJECT_NAME,
    language: settings.sendLanguageMetadata ? context.language : REDACTED_LANGUAGE,
    filePath: context.filePath,
    gitBranch: context.gitBranch,
  };

  switch (settings.filePathMode) {
    case 'hidden':
      shaped.filePath = undefined;
      break;
    case 'masked':
      shaped.filePath = context.filePath ? path.basename(context.filePath) : undefined;
      break;
    case 'full':
    default:
      break;
  }

  return sanitizeEditorContext(shaped);
}

export function createActivityEvent(
  eventType: ActivityEventType,
  context: EditorContext,
  machine: MachineInfo,
  now: Date,
  randomID: string,
): ActivityEvent {
  const sanitizedContext = sanitizeEditorContext(context);

  return {
    id: clampRequired(randomID, MAX_EVENT_ID_LENGTH, 'event id'),
    timestamp: now.toISOString(),
    eventType,
    machineId: clampRequired(machine.machineId, MAX_MACHINE_ID_LENGTH, 'machine'),
    workspaceId: sanitizedContext.workspaceId,
    projectName: sanitizedContext.projectName,
    language: sanitizedContext.language,
    filePath: sanitizedContext.filePath,
    gitBranch: sanitizedContext.gitBranch,
  };
}

export function clampOptional(value: string | undefined, maxLength: number): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return trimmed.slice(0, maxLength);
}

export function clampRequired(value: string, maxLength: number, fieldName: string): string {
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new Error(`missing ${fieldName}`);
  }
  if (trimmed.length <= maxLength) {
    return trimmed;
  }
  return trimmed.slice(0, maxLength);
}

function sanitizeExclusions(exclusions: ExclusionsSettings): ExclusionsSettings {
  return {
    folders: sanitizeStringList(exclusions.folders),
    projectNames: sanitizeStringList(exclusions.projectNames),
    workspacePatterns: sanitizeStringList(exclusions.workspacePatterns),
    fileExtensions: sanitizeStringList(exclusions.fileExtensions),
    machines: sanitizeStringList(exclusions.machines),
  };
}

function sanitizeStringList(values: string[]): string[] {
  const unique = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (trimmed !== '') {
      unique.add(trimmed);
    }
  }
  return [...unique];
}

function clampNumber(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return Math.trunc(value);
}

function sanitizePositiveInteger(value: number, fallback: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.trunc(value);
  if (normalized < 1) {
    return fallback;
  }

  return normalized;
}

function sanitizeOptionalPositiveInteger(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return undefined;
  }

  const normalized = Math.trunc(value);
  if (normalized < 1) {
    return undefined;
  }

  return normalized;
}

function matchWorkspacePattern(pattern: string, workspaceId: string): boolean {
  const escaped = pattern.replace(/[|\\{}()[\]^$+?.]/g, '\\$&').replaceAll('*', '.*');
  const regex = new RegExp(`^${escaped}$`, 'i');
  return regex.test(workspaceId);
}
