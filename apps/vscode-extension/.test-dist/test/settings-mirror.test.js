"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const node_test_1 = __importDefault(require("node:test"));
const mirror_1 = require("../src/runtime/settings/mirror");
const defaults_1 = require("../src/runtime/settings/defaults");
const storage_1 = require("../src/runtime/storage");
(0, node_test_1.default)('first-run with no cached snapshot uses centralized sane defaults', async () => {
    const harness = await createHarness();
    try {
        await harness.mirror.initialize();
        strict_1.default.deepEqual(harness.mirror.getEffectiveSettings(), (0, defaults_1.cloneDefaultEffectiveSettings)());
    }
    finally {
        await harness.close();
    }
});
(0, node_test_1.default)('startup with cached snapshot loads mirrored desktop settings', async () => {
    const harness = await createHarness();
    try {
        const cachedSettings = {
            ...(0, defaults_1.cloneDefaultEffectiveSettings)(),
            trackEditEvents: false,
            trackOnlyWhenFocused: true,
        };
        await harness.storage.writeSettingsSnapshot(createSnapshotRow({
            version: 'cached-v1',
            payloadJson: JSON.stringify(cachedSettings),
        }));
        await harness.mirror.initialize();
        strict_1.default.equal(harness.mirror.getEffectiveSettings().trackEditEvents, false);
        strict_1.default.equal(harness.mirror.getEffectiveSettings().trackOnlyWhenFocused, true);
    }
    finally {
        await harness.close();
    }
});
(0, node_test_1.default)('handshake with different settings version atomically replaces cached snapshot', async () => {
    const harness = await createHarness();
    try {
        await harness.storage.writeSettingsSnapshot(createSnapshotRow({
            version: 'cached-v1',
            payloadJson: JSON.stringify({
                ...(0, defaults_1.cloneDefaultEffectiveSettings)(),
                trackEditEvents: false,
            }),
            fetchedAt: '2026-04-09T11:00:00Z',
        }));
        await harness.mirror.initialize();
        const nextSettings = {
            ...(0, defaults_1.cloneDefaultEffectiveSettings)(),
            trackEditEvents: true,
            trackSaveEvents: true,
        };
        const result = await harness.mirror.applyHandshake(createHandshakeResponse(nextSettings, {
            settingsVersion: 'cached-v2',
            settingsUpdatedAt: '2026-04-09T12:00:00Z',
        }));
        strict_1.default.equal(result.snapshotUpdated, true);
        const persisted = await harness.storage.readSettingsSnapshot(storage_1.SETTINGS_SNAPSHOT_DEFAULT_KEY);
        strict_1.default.ok(persisted);
        strict_1.default.equal(persisted?.version, 'cached-v2');
        strict_1.default.equal(persisted?.updatedAt, '2026-04-09T12:00:00Z');
        strict_1.default.equal(persisted?.fetchedAt, '2026-04-09T12:30:00.000Z');
        strict_1.default.equal(harness.mirror.getEffectiveSettings().trackSaveEvents, true);
    }
    finally {
        await harness.close();
    }
});
(0, node_test_1.default)('handshake with unchanged settings version keeps cached snapshot unchanged', async () => {
    const harness = await createHarness();
    try {
        const settings = (0, defaults_1.cloneDefaultEffectiveSettings)();
        const existing = createSnapshotRow({
            version: 'cached-v1',
            payloadJson: JSON.stringify(settings),
            sourceInstanceId: 'desktop-instance-old',
            fetchedAt: '2026-04-09T11:00:00Z',
        });
        await harness.storage.writeSettingsSnapshot(existing);
        await harness.mirror.initialize();
        const result = await harness.mirror.applyHandshake(createHandshakeResponse(settings, {
            settingsVersion: 'cached-v1',
            desktopInstanceId: 'desktop-instance-new',
        }));
        strict_1.default.equal(result.snapshotUpdated, false);
        const persisted = await harness.storage.readSettingsSnapshot(storage_1.SETTINGS_SNAPSHOT_DEFAULT_KEY);
        strict_1.default.deepEqual(persisted, existing);
    }
    finally {
        await harness.close();
    }
});
async function createHarness() {
    const tempDir = node_fs_1.default.mkdtempSync(node_path_1.default.join(node_os_1.default.tmpdir(), 'kairos-settings-mirror-'));
    const dbPath = node_path_1.default.join(tempDir, storage_1.OUTBOX_DATABASE_FILE_NAME);
    const storage = await (0, storage_1.openOutboxStorage)({ databasePath: dbPath });
    const observer = {
        logInfo() { },
        logWarn() { },
        logError() { },
        updateStatus() { },
    };
    const mirror = new mirror_1.ExtensionSettingsMirror({
        storage,
        observer,
        now: () => new Date('2026-04-09T12:30:00Z'),
    });
    return {
        storage,
        mirror,
        async close() {
            await storage.close();
            node_fs_1.default.rmSync(tempDir, { recursive: true, force: true });
        },
    };
}
function createSnapshotRow(overrides) {
    return {
        snapshotKey: storage_1.SETTINGS_SNAPSHOT_DEFAULT_KEY,
        version: overrides.version ?? 'cached-v1',
        updatedAt: overrides.updatedAt ?? '2026-04-09T11:00:00Z',
        payloadJson: overrides.payloadJson ?? JSON.stringify((0, defaults_1.cloneDefaultEffectiveSettings)()),
        sourceInstanceId: overrides.sourceInstanceId ?? 'desktop-instance-1',
        fetchedAt: overrides.fetchedAt ?? '2026-04-09T11:30:00Z',
    };
}
function createHandshakeResponse(settings, overrides = {}) {
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
//# sourceMappingURL=settings-mirror.test.js.map