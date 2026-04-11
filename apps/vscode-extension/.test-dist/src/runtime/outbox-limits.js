"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_OUTBOX_THRESHOLDS = exports.DEFAULT_OUTBOX_HARD_CAP_BYTES = exports.DEFAULT_OUTBOX_WARNING_THRESHOLD_BYTES = exports.DEFAULT_OUTBOX_SOFT_THRESHOLD_BYTES = void 0;
exports.resolveOutboxThresholds = resolveOutboxThresholds;
exports.classifyOutboxThresholdState = classifyOutboxThresholdState;
exports.buildOutboxLimitStatus = buildOutboxLimitStatus;
const MEBIBYTE = 1024 * 1024;
exports.DEFAULT_OUTBOX_SOFT_THRESHOLD_BYTES = 100 * MEBIBYTE;
exports.DEFAULT_OUTBOX_WARNING_THRESHOLD_BYTES = 250 * MEBIBYTE;
exports.DEFAULT_OUTBOX_HARD_CAP_BYTES = 500 * MEBIBYTE;
exports.DEFAULT_OUTBOX_THRESHOLDS = {
    softThresholdBytes: exports.DEFAULT_OUTBOX_SOFT_THRESHOLD_BYTES,
    warningThresholdBytes: exports.DEFAULT_OUTBOX_WARNING_THRESHOLD_BYTES,
    hardCapBytes: exports.DEFAULT_OUTBOX_HARD_CAP_BYTES,
};
function resolveOutboxThresholds(settings) {
    const configuredHardCap = sanitizeOptionalPositiveInteger(settings.outboxHardCapBytes);
    const hardCapBytes = configuredHardCap ?? exports.DEFAULT_OUTBOX_HARD_CAP_BYTES;
    const warningThresholdBytes = Math.min(exports.DEFAULT_OUTBOX_WARNING_THRESHOLD_BYTES, hardCapBytes);
    const softThresholdBytes = Math.min(exports.DEFAULT_OUTBOX_SOFT_THRESHOLD_BYTES, warningThresholdBytes);
    return {
        softThresholdBytes,
        warningThresholdBytes,
        hardCapBytes,
    };
}
function classifyOutboxThresholdState(estimatedSizeBytes, thresholds) {
    const sizeBytes = sanitizeSizeBytes(estimatedSizeBytes);
    if (sizeBytes >= thresholds.hardCapBytes) {
        return 'hard';
    }
    if (sizeBytes >= thresholds.warningThresholdBytes) {
        return 'warning';
    }
    if (sizeBytes >= thresholds.softThresholdBytes) {
        return 'soft';
    }
    return 'normal';
}
function buildOutboxLimitStatus(estimatedSizeBytes, settings) {
    const thresholds = resolveOutboxThresholds(settings);
    const normalizedSize = sanitizeSizeBytes(estimatedSizeBytes);
    const thresholdState = classifyOutboxThresholdState(normalizedSize, thresholds);
    return {
        estimatedSizeBytes: normalizedSize,
        thresholdState,
        captureBlockedByHardCap: thresholdState === 'hard',
        thresholds,
    };
}
function sanitizeOptionalPositiveInteger(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || !value || value <= 0) {
        return undefined;
    }
    return Math.floor(value);
}
function sanitizeSizeBytes(value) {
    if (!Number.isFinite(value) || value <= 0) {
        return 0;
    }
    return Math.floor(value);
}
//# sourceMappingURL=outbox-limits.js.map