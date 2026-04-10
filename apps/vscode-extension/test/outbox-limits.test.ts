import assert from 'node:assert/strict';
import test from 'node:test';

import { getDefaultEffectiveSettings } from '../src/runtime/filters';
import {
  buildOutboxLimitStatus,
  classifyOutboxThresholdState,
  DEFAULT_OUTBOX_HARD_CAP_BYTES,
  DEFAULT_OUTBOX_SOFT_THRESHOLD_BYTES,
  DEFAULT_OUTBOX_WARNING_THRESHOLD_BYTES,
  DEFAULT_OUTBOX_THRESHOLDS,
  resolveOutboxThresholds,
} from '../src/runtime/outbox-limits';

test('outbox threshold defaults are explicit and centralized', () => {
  assert.equal(DEFAULT_OUTBOX_SOFT_THRESHOLD_BYTES, 100 * 1024 * 1024);
  assert.equal(DEFAULT_OUTBOX_WARNING_THRESHOLD_BYTES, 250 * 1024 * 1024);
  assert.equal(DEFAULT_OUTBOX_HARD_CAP_BYTES, 500 * 1024 * 1024);
  assert.deepEqual(DEFAULT_OUTBOX_THRESHOLDS, {
    softThresholdBytes: 100 * 1024 * 1024,
    warningThresholdBytes: 250 * 1024 * 1024,
    hardCapBytes: 500 * 1024 * 1024,
  });
});

test('threshold classification behavior follows soft warning hard ordering', () => {
  const thresholds = DEFAULT_OUTBOX_THRESHOLDS;
  assert.equal(classifyOutboxThresholdState(0, thresholds), 'normal');
  assert.equal(classifyOutboxThresholdState(thresholds.softThresholdBytes, thresholds), 'soft');
  assert.equal(classifyOutboxThresholdState(thresholds.warningThresholdBytes, thresholds), 'warning');
  assert.equal(classifyOutboxThresholdState(thresholds.hardCapBytes, thresholds), 'hard');
});

test('hard-cap override from effective settings is applied and normalized', () => {
  const settings = {
    ...getDefaultEffectiveSettings(),
    outboxHardCapBytes: 60 * 1024 * 1024,
  };

  const thresholds = resolveOutboxThresholds(settings);
  assert.equal(thresholds.hardCapBytes, 60 * 1024 * 1024);
  assert.equal(thresholds.warningThresholdBytes, 60 * 1024 * 1024);
  assert.equal(thresholds.softThresholdBytes, 60 * 1024 * 1024);
});

test('limit status exposes warning and hard-cap blocking state', () => {
  const settings = getDefaultEffectiveSettings();
  const warningStatus = buildOutboxLimitStatus(DEFAULT_OUTBOX_WARNING_THRESHOLD_BYTES, settings);
  assert.equal(warningStatus.thresholdState, 'warning');
  assert.equal(warningStatus.captureBlockedByHardCap, false);

  const hardStatus = buildOutboxLimitStatus(DEFAULT_OUTBOX_HARD_CAP_BYTES, settings);
  assert.equal(hardStatus.thresholdState, 'hard');
  assert.equal(hardStatus.captureBlockedByHardCap, true);
});
