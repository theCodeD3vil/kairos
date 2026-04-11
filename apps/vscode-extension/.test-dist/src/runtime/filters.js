"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultEffectiveSettings = getDefaultEffectiveSettings;
exports.sanitizeEffectiveSettings = sanitizeEffectiveSettings;
exports.sanitizeMachine = sanitizeMachine;
exports.sanitizeEditorContext = sanitizeEditorContext;
exports.shouldEmitEvent = shouldEmitEvent;
exports.isCodingContext = isCodingContext;
exports.isExcludedContext = isExcludedContext;
exports.shapeContextForEmission = shapeContextForEmission;
exports.createActivityEvent = createActivityEvent;
exports.clampOptional = clampOptional;
exports.clampRequired = clampRequired;
const node_path_1 = __importDefault(require("node:path"));
const constants_1 = require("./constants");
const defaults_1 = require("./settings/defaults");
const NON_CODING_LANGUAGE_IDS = new Set(['scminput']);
function getDefaultEffectiveSettings() {
    return (0, defaults_1.cloneDefaultEffectiveSettings)();
}
function sanitizeEffectiveSettings(settings) {
    if (!settings) {
        return getDefaultEffectiveSettings();
    }
    return {
        trackingEnabled: settings.trackingEnabled,
        idleDetectionEnabled: settings.idleDetectionEnabled,
        idleTimeoutMinutes: clampNumber(settings.idleTimeoutMinutes, 1, 180, defaults_1.DEFAULT_EFFECTIVE_SETTINGS.idleTimeoutMinutes),
        sessionMergeThresholdMinutes: clampNumber(settings.sessionMergeThresholdMinutes, 0, 180, defaults_1.DEFAULT_EFFECTIVE_SETTINGS.sessionMergeThresholdMinutes),
        localOnlyMode: settings.localOnlyMode,
        filePathMode: settings.filePathMode,
        exclusions: sanitizeExclusions(settings.exclusions),
        autoConnect: settings.autoConnect,
        sendHeartbeatEvents: settings.sendHeartbeatEvents,
        heartbeatIntervalSeconds: sanitizePositiveInteger(settings.heartbeatIntervalSeconds, defaults_1.DEFAULT_EFFECTIVE_SETTINGS.heartbeatIntervalSeconds),
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
function sanitizeMachine(machine, sendMachineAttribution) {
    const machineId = clampRequired(machine.machineId, constants_1.MAX_MACHINE_ID_LENGTH, 'machine');
    const machineName = clampRequired(machine.machineName || machineId, constants_1.MAX_MACHINE_NAME_LENGTH, 'machine');
    return {
        machineId,
        machineName,
        osPlatform: clampRequired(machine.osPlatform, constants_1.MAX_OS_PLATFORM_LENGTH, 'machine'),
        hostname: sendMachineAttribution ? clampOptional(machine.hostname, constants_1.MAX_HOSTNAME_LENGTH) : undefined,
        osVersion: sendMachineAttribution ? clampOptional(machine.osVersion, constants_1.MAX_OS_VERSION_LENGTH) : undefined,
        arch: sendMachineAttribution ? clampOptional(machine.arch, constants_1.MAX_ARCH_LENGTH) : undefined,
    };
}
function sanitizeEditorContext(context) {
    return {
        workspaceId: clampRequired(context.workspaceId, constants_1.MAX_WORKSPACE_ID_LENGTH, 'workspace'),
        projectName: clampRequired(context.projectName, constants_1.MAX_PROJECT_NAME_LENGTH, 'project'),
        language: clampRequired(context.language, constants_1.MAX_LANGUAGE_LENGTH, 'language'),
        filePath: clampOptional(context.filePath, constants_1.MAX_FILE_PATH_LENGTH),
        gitBranch: clampOptional(context.gitBranch, constants_1.MAX_GIT_BRANCH_LENGTH),
    };
}
function shouldEmitEvent(eventType, settings, focused) {
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
function isCodingContext(context) {
    if (!context.filePath?.trim()) {
        return false;
    }
    return !NON_CODING_LANGUAGE_IDS.has(context.language.trim().toLowerCase());
}
function isExcludedContext(context, machine, exclusions) {
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
function shapeContextForEmission(context, settings) {
    const shaped = {
        workspaceId: settings.sendProjectMetadata ? context.workspaceId : constants_1.REDACTED_WORKSPACE_ID,
        projectName: settings.sendProjectMetadata ? context.projectName : constants_1.REDACTED_PROJECT_NAME,
        language: settings.sendLanguageMetadata ? context.language : constants_1.REDACTED_LANGUAGE,
        filePath: context.filePath,
        gitBranch: context.gitBranch,
    };
    switch (settings.filePathMode) {
        case 'hidden':
            shaped.filePath = undefined;
            break;
        case 'masked':
            shaped.filePath = context.filePath ? node_path_1.default.basename(context.filePath) : undefined;
            break;
        case 'full':
        default:
            break;
    }
    return sanitizeEditorContext(shaped);
}
function createActivityEvent(eventType, context, machine, now, randomID) {
    const sanitizedContext = sanitizeEditorContext(context);
    return {
        id: clampRequired(randomID, constants_1.MAX_EVENT_ID_LENGTH, 'event id'),
        timestamp: now.toISOString(),
        eventType,
        machineId: clampRequired(machine.machineId, constants_1.MAX_MACHINE_ID_LENGTH, 'machine'),
        workspaceId: sanitizedContext.workspaceId,
        projectName: sanitizedContext.projectName,
        language: sanitizedContext.language,
        filePath: sanitizedContext.filePath,
        gitBranch: sanitizedContext.gitBranch,
    };
}
function clampOptional(value, maxLength) {
    const trimmed = value?.trim();
    if (!trimmed) {
        return undefined;
    }
    if (trimmed.length <= maxLength) {
        return trimmed;
    }
    return trimmed.slice(0, maxLength);
}
function clampRequired(value, maxLength, fieldName) {
    const trimmed = value.trim();
    if (trimmed === '') {
        throw new Error(`missing ${fieldName}`);
    }
    if (trimmed.length <= maxLength) {
        return trimmed;
    }
    return trimmed.slice(0, maxLength);
}
function sanitizeExclusions(exclusions) {
    return {
        folders: sanitizeStringList(exclusions.folders),
        projectNames: sanitizeStringList(exclusions.projectNames),
        workspacePatterns: sanitizeStringList(exclusions.workspacePatterns),
        fileExtensions: sanitizeStringList(exclusions.fileExtensions),
        machines: sanitizeStringList(exclusions.machines),
    };
}
function sanitizeStringList(values) {
    const unique = new Set();
    for (const value of values) {
        const trimmed = value.trim();
        if (trimmed !== '') {
            unique.add(trimmed);
        }
    }
    return [...unique];
}
function clampNumber(value, min, max, fallback) {
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
function sanitizePositiveInteger(value, fallback) {
    if (!Number.isFinite(value)) {
        return fallback;
    }
    const normalized = Math.trunc(value);
    if (normalized < 1) {
        return fallback;
    }
    return normalized;
}
function sanitizeOptionalPositiveInteger(value) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return undefined;
    }
    const normalized = Math.trunc(value);
    if (normalized < 1) {
        return undefined;
    }
    return normalized;
}
function matchWorkspacePattern(pattern, workspaceId) {
    const escaped = pattern.replace(/[|\\{}()[\]^$+?.]/g, '\\$&').replaceAll('*', '.*');
    const regex = new RegExp(`^${escaped}$`, 'i');
    return regex.test(workspaceId);
}
//# sourceMappingURL=filters.js.map