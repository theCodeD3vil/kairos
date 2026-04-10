import type { ExtensionEffectiveSettings } from '@kairos/shared/settings';

const MEBIBYTE = 1024 * 1024;

export const DEFAULT_OUTBOX_SOFT_THRESHOLD_BYTES = 100 * MEBIBYTE;
export const DEFAULT_OUTBOX_WARNING_THRESHOLD_BYTES = 250 * MEBIBYTE;
export const DEFAULT_OUTBOX_HARD_CAP_BYTES = 500 * MEBIBYTE;

export type OutboxThresholdState = 'normal' | 'soft' | 'warning' | 'hard';

export type OutboxThresholds = {
  softThresholdBytes: number;
  warningThresholdBytes: number;
  hardCapBytes: number;
};

export type OutboxLimitStatus = {
  estimatedSizeBytes: number;
  thresholdState: OutboxThresholdState;
  captureBlockedByHardCap: boolean;
  thresholds: OutboxThresholds;
};

export const DEFAULT_OUTBOX_THRESHOLDS: OutboxThresholds = {
  softThresholdBytes: DEFAULT_OUTBOX_SOFT_THRESHOLD_BYTES,
  warningThresholdBytes: DEFAULT_OUTBOX_WARNING_THRESHOLD_BYTES,
  hardCapBytes: DEFAULT_OUTBOX_HARD_CAP_BYTES,
};

export function resolveOutboxThresholds(settings: ExtensionEffectiveSettings): OutboxThresholds {
  const configuredHardCap = sanitizeOptionalPositiveInteger(settings.outboxHardCapBytes);
  const hardCapBytes = configuredHardCap ?? DEFAULT_OUTBOX_HARD_CAP_BYTES;
  const warningThresholdBytes = Math.min(DEFAULT_OUTBOX_WARNING_THRESHOLD_BYTES, hardCapBytes);
  const softThresholdBytes = Math.min(DEFAULT_OUTBOX_SOFT_THRESHOLD_BYTES, warningThresholdBytes);

  return {
    softThresholdBytes,
    warningThresholdBytes,
    hardCapBytes,
  };
}

export function classifyOutboxThresholdState(
  estimatedSizeBytes: number,
  thresholds: OutboxThresholds,
): OutboxThresholdState {
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

export function buildOutboxLimitStatus(
  estimatedSizeBytes: number,
  settings: ExtensionEffectiveSettings,
): OutboxLimitStatus {
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

function sanitizeOptionalPositiveInteger(value: number | undefined): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || !value || value <= 0) {
    return undefined;
  }
  return Math.floor(value);
}

function sanitizeSizeBytes(value: number): number {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }
  return Math.floor(value);
}
