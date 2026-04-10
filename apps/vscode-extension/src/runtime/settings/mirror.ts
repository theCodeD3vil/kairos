import type {
  ExtensionEffectiveSettings,
  ExtensionHandshakeResponse,
} from '@kairos/shared/settings';

import { sanitizeEffectiveSettings } from '../filters';
import {
  SETTINGS_SNAPSHOT_DEFAULT_KEY,
  type OutboxStorageHandle,
  type SettingsSnapshotRow,
} from '../storage';
import type { RuntimeObserver } from '../types';
import { cloneDefaultEffectiveSettings } from './defaults';

type SettingsMirrorDependencies = {
  storage: OutboxStorageHandle;
  observer: RuntimeObserver;
  now: () => Date;
  snapshotKey?: string;
  initialSettings?: ExtensionEffectiveSettings;
};

export class ExtensionSettingsMirror {
  private readonly storage: OutboxStorageHandle;
  private readonly observer: RuntimeObserver;
  private readonly now: () => Date;
  private readonly snapshotKey: string;

  private effectiveSettings: ExtensionEffectiveSettings;
  private cachedSnapshot: SettingsSnapshotRow | null = null;
  private cachedSnapshotPayloadValid = false;

  constructor(deps: SettingsMirrorDependencies) {
    this.storage = deps.storage;
    this.observer = deps.observer;
    this.now = deps.now;
    this.snapshotKey = deps.snapshotKey ?? SETTINGS_SNAPSHOT_DEFAULT_KEY;
    this.effectiveSettings = sanitizeEffectiveSettings(deps.initialSettings ?? cloneDefaultEffectiveSettings());
  }

  async initialize(): Promise<void> {
    const snapshot = await this.storage.readSettingsSnapshot(this.snapshotKey);
    this.cachedSnapshot = snapshot;
    if (!snapshot) {
      return;
    }

    const parsed = this.parseSnapshotPayload(snapshot.payloadJson);
    if (!parsed) {
      this.cachedSnapshotPayloadValid = false;
      return;
    }

    this.cachedSnapshotPayloadValid = true;
    this.effectiveSettings = sanitizeEffectiveSettings(parsed);
  }

  getEffectiveSettings(): ExtensionEffectiveSettings {
    return this.effectiveSettings;
  }

  getCachedSettingsVersion(): string | null {
    return this.cachedSnapshot?.version ?? null;
  }

  async applyHandshake(response: ExtensionHandshakeResponse): Promise<{ snapshotUpdated: boolean }> {
    this.effectiveSettings = sanitizeEffectiveSettings(response.settings);

    if (!response.capabilities.settingsSnapshotMirror) {
      return { snapshotUpdated: false };
    }

    const shouldReplaceSnapshot =
      !this.cachedSnapshot
      || !this.cachedSnapshotPayloadValid
      || this.cachedSnapshot.version !== response.settingsVersion;
    if (!shouldReplaceSnapshot) {
      return { snapshotUpdated: false };
    }

    const replacement: SettingsSnapshotRow = {
      snapshotKey: this.snapshotKey,
      version: response.settingsVersion,
      updatedAt: response.settingsUpdatedAt,
      payloadJson: JSON.stringify(response.settings),
      sourceInstanceId: response.desktopInstanceId,
      fetchedAt: this.now().toISOString(),
    };
    await this.storage.writeSettingsSnapshot(replacement);
    this.cachedSnapshot = replacement;
    this.cachedSnapshotPayloadValid = true;
    return { snapshotUpdated: true };
  }

  private parseSnapshotPayload(payloadJSON: string): ExtensionEffectiveSettings | null {
    try {
      return JSON.parse(payloadJSON) as ExtensionEffectiveSettings;
    } catch (error) {
      this.observer.logWarn(`Failed to parse cached desktop settings snapshot: ${formatError(error)}`);
      return null;
    }
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}
