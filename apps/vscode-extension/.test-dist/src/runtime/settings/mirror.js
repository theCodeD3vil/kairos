"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionSettingsMirror = void 0;
const filters_1 = require("../filters");
const storage_1 = require("../storage");
const defaults_1 = require("./defaults");
class ExtensionSettingsMirror {
    storage;
    observer;
    now;
    snapshotKey;
    effectiveSettings;
    cachedSnapshot = null;
    cachedSnapshotPayloadValid = false;
    constructor(deps) {
        this.storage = deps.storage;
        this.observer = deps.observer;
        this.now = deps.now;
        this.snapshotKey = deps.snapshotKey ?? storage_1.SETTINGS_SNAPSHOT_DEFAULT_KEY;
        this.effectiveSettings = (0, filters_1.sanitizeEffectiveSettings)(deps.initialSettings ?? (0, defaults_1.cloneDefaultEffectiveSettings)());
    }
    async initialize() {
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
        this.effectiveSettings = (0, filters_1.sanitizeEffectiveSettings)(parsed);
    }
    getEffectiveSettings() {
        return this.effectiveSettings;
    }
    getCachedSettingsVersion() {
        return this.cachedSnapshot?.version ?? null;
    }
    async applyHandshake(response) {
        this.effectiveSettings = (0, filters_1.sanitizeEffectiveSettings)(response.settings);
        if (!response.capabilities.settingsSnapshotMirror) {
            return { snapshotUpdated: false };
        }
        const shouldReplaceSnapshot = !this.cachedSnapshot
            || !this.cachedSnapshotPayloadValid
            || this.cachedSnapshot.version !== response.settingsVersion;
        if (!shouldReplaceSnapshot) {
            return { snapshotUpdated: false };
        }
        const replacement = {
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
    parseSnapshotPayload(payloadJSON) {
        try {
            return JSON.parse(payloadJSON);
        }
        catch (error) {
            this.observer.logWarn(`Failed to parse cached desktop settings snapshot: ${formatError(error)}`);
            return null;
        }
    }
}
exports.ExtensionSettingsMirror = ExtensionSettingsMirror;
function formatError(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
//# sourceMappingURL=mirror.js.map