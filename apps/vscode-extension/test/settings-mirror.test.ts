import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import type {
  ExtensionEffectiveSettings,
  ExtensionHandshakeResponse,
} from '@kairos/shared/settings';

import { ExtensionSettingsMirror } from '../src/runtime/settings/mirror';
import { cloneDefaultEffectiveSettings } from '../src/runtime/settings/defaults';
import {
  openOutboxStorage,
  OUTBOX_DATABASE_FILE_NAME,
  SETTINGS_SNAPSHOT_DEFAULT_KEY,
  type OutboxStorageHandle,
  type SettingsSnapshotRow,
} from '../src/runtime/storage';
import type { RuntimeObserver } from '../src/runtime/types';

test('first-run with no cached snapshot uses centralized sane defaults', async () => {
  const harness = await createHarness();
  try {
    await harness.mirror.initialize();
    assert.deepEqual(harness.mirror.getEffectiveSettings(), cloneDefaultEffectiveSettings());
  } finally {
    await harness.close();
  }
});

test('startup with cached snapshot loads mirrored desktop settings', async () => {
  const harness = await createHarness();
  try {
    const cachedSettings = {
      ...cloneDefaultEffectiveSettings(),
      trackEditEvents: false,
      trackOnlyWhenFocused: true,
    };
    await harness.storage.writeSettingsSnapshot(createSnapshotRow({
      version: 'cached-v1',
      payloadJson: JSON.stringify(cachedSettings),
    }));

    await harness.mirror.initialize();

    assert.equal(harness.mirror.getEffectiveSettings().trackEditEvents, false);
    assert.equal(harness.mirror.getEffectiveSettings().trackOnlyWhenFocused, true);
  } finally {
    await harness.close();
  }
});

test('handshake with different settings version atomically replaces cached snapshot', async () => {
  const harness = await createHarness();
  try {
    await harness.storage.writeSettingsSnapshot(createSnapshotRow({
      version: 'cached-v1',
      payloadJson: JSON.stringify({
        ...cloneDefaultEffectiveSettings(),
        trackEditEvents: false,
      }),
      fetchedAt: '2026-04-09T11:00:00Z',
    }));
    await harness.mirror.initialize();

    const nextSettings: ExtensionEffectiveSettings = {
      ...cloneDefaultEffectiveSettings(),
      trackEditEvents: true,
      trackSaveEvents: true,
    };
    const result = await harness.mirror.applyHandshake(
      createHandshakeResponse(nextSettings, {
        settingsVersion: 'cached-v2',
        settingsUpdatedAt: '2026-04-09T12:00:00Z',
      }),
    );

    assert.equal(result.snapshotUpdated, true);
    const persisted = await harness.storage.readSettingsSnapshot(SETTINGS_SNAPSHOT_DEFAULT_KEY);
    assert.ok(persisted);
    assert.equal(persisted?.version, 'cached-v2');
    assert.equal(persisted?.updatedAt, '2026-04-09T12:00:00Z');
    assert.equal(persisted?.fetchedAt, '2026-04-09T12:30:00.000Z');
    assert.equal(harness.mirror.getEffectiveSettings().trackSaveEvents, true);
  } finally {
    await harness.close();
  }
});

test('handshake with unchanged settings version keeps cached snapshot unchanged', async () => {
  const harness = await createHarness();
  try {
    const settings = cloneDefaultEffectiveSettings();
    const existing = createSnapshotRow({
      version: 'cached-v1',
      payloadJson: JSON.stringify(settings),
      sourceInstanceId: 'desktop-instance-old',
      fetchedAt: '2026-04-09T11:00:00Z',
    });
    await harness.storage.writeSettingsSnapshot(existing);
    await harness.mirror.initialize();

    const result = await harness.mirror.applyHandshake(
      createHandshakeResponse(settings, {
        settingsVersion: 'cached-v1',
        desktopInstanceId: 'desktop-instance-new',
      }),
    );

    assert.equal(result.snapshotUpdated, false);
    const persisted = await harness.storage.readSettingsSnapshot(SETTINGS_SNAPSHOT_DEFAULT_KEY);
    assert.deepEqual(persisted, existing);
  } finally {
    await harness.close();
  }
});

async function createHarness(): Promise<{
  storage: OutboxStorageHandle;
  mirror: ExtensionSettingsMirror;
  close: () => Promise<void>;
}> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kairos-settings-mirror-'));
  const dbPath = path.join(tempDir, OUTBOX_DATABASE_FILE_NAME);
  const storage = await openOutboxStorage({ databasePath: dbPath });
  const observer: RuntimeObserver = {
    logInfo() {},
    logWarn() {},
    logError() {},
    updateStatus() {},
  };
  const mirror = new ExtensionSettingsMirror({
    storage,
    observer,
    now: () => new Date('2026-04-09T12:30:00Z'),
  });

  return {
    storage,
    mirror,
    async close() {
      await storage.close();
      fs.rmSync(tempDir, { recursive: true, force: true });
    },
  };
}

function createSnapshotRow(overrides: Partial<SettingsSnapshotRow>): SettingsSnapshotRow {
  return {
    snapshotKey: SETTINGS_SNAPSHOT_DEFAULT_KEY,
    version: overrides.version ?? 'cached-v1',
    updatedAt: overrides.updatedAt ?? '2026-04-09T11:00:00Z',
    payloadJson: overrides.payloadJson ?? JSON.stringify(cloneDefaultEffectiveSettings()),
    sourceInstanceId: overrides.sourceInstanceId ?? 'desktop-instance-1',
    fetchedAt: overrides.fetchedAt ?? '2026-04-09T11:30:00Z',
  };
}

function createHandshakeResponse(
  settings: ExtensionEffectiveSettings,
  overrides: Partial<ExtensionHandshakeResponse> = {},
): ExtensionHandshakeResponse {
  return {
    desktopInstanceId: 'desktop-instance-1',
    protocolVersion: 2,
    capabilities: {
      perEventIngestionResults: true,
      settingsSnapshotMirror: true,
    },
    limits: {
      maxBatchEvents: 500,
      maxRequestBytes: 1_048_576,
    },
    settings,
    settingsVersion: 'cached-v1',
    settingsUpdatedAt: '2026-04-09T11:59:00Z',
    serverTimestamp: '2026-04-09T12:00:00Z',
    ...overrides,
  };
}
