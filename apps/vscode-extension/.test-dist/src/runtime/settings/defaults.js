"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_EFFECTIVE_SETTINGS = void 0;
exports.cloneDefaultEffectiveSettings = cloneDefaultEffectiveSettings;
const constants_1 = require("../constants");
exports.DEFAULT_EFFECTIVE_SETTINGS = {
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
    heartbeatIntervalSeconds: constants_1.DEFAULT_HEARTBEAT_INTERVAL_SECONDS,
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
function cloneDefaultEffectiveSettings() {
    return {
        ...exports.DEFAULT_EFFECTIVE_SETTINGS,
        exclusions: {
            ...exports.DEFAULT_EFFECTIVE_SETTINGS.exclusions,
        },
    };
}
//# sourceMappingURL=defaults.js.map