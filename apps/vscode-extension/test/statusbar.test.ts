import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildStatusBarText,
  buildStatusBarTooltip,
  buildStatusSummary,
  formatDuration,
  getStatusBarActions,
} from '../src/statusbar';
import type { RuntimeStatusSnapshot } from '../src/runtime/types';

test('formatDuration renders compact today labels', () => {
  assert.equal(formatDuration(12), '12m');
  assert.equal(formatDuration(68), '1h 08m');
  assert.equal(formatDuration(272), '4h 32m');
});

test('buildStatusBarText selects concise state-aware labels', () => {
  assert.equal(buildStatusBarText(createSnapshot({ displayState: 'active', todayTrackedMinutes: 84 })), '$(code) 1h 24m');
  assert.equal(buildStatusBarText(createSnapshot({ displayState: 'tracking-disabled' })), '$(code) 1h 24m');
  assert.equal(buildStatusBarText(createSnapshot({ displayState: 'disconnected', connectionState: 'disconnected' })), '$(code) 1h 24m');
  assert.equal(buildStatusBarText(createSnapshot({ displayState: 'buffering', connectionState: 'offline-buffering' })), '$(code) 1h 24m');
  assert.equal(buildStatusBarText(createSnapshot({ displayState: 'idle' })), '$(code) 1h 24m');
});

test('buildStatusBarTooltip focuses on coding session details', () => {
  const tooltip = buildStatusBarTooltip(
    createSnapshot({
      displayState: 'active',
      currentSessionMinutes: 42,
      currentSessionActive: true,
      currentSessionStartedAt: '2026-04-06T10:00:00Z',
      currentSessionLastActivityAt: '2026-04-06T10:06:00Z',
      activeFilePath: '/workspace/kairos/src/runtime/runtime.ts',
      activeLanguage: 'typescript',
    }),
  );

  assert.match(tooltip, /\*\*Kairos Coding Session\*\*/);
  assert.match(tooltip, /Today: \*\*1h 24m\*\*/);
  assert.match(tooltip, /Current session: \*\*42m\*\*/);
  assert.match(tooltip, /Session: \*\*Live\*\*/);
  assert.match(tooltip, /Started:/);
  assert.match(tooltip, /Last activity:/);
  assert.match(tooltip, /File: \*\*\\\.\\\.\\\.\/runtime\/runtime\\.ts\*\*/);
  assert.match(tooltip, /Language: \*\*typescript\*\*/);
});

test('buildStatusSummary and action list adapt to disconnected runtime state', () => {
  const snapshot = createSnapshot({
    displayState: 'disconnected',
    connectionState: 'disconnected',
    currentSessionMinutes: 23,
    currentSessionActive: false,
    activeLanguage: 'typescript',
  });

  assert.equal(buildStatusSummary(snapshot), 'Today 1h 24m • Session 23m • Paused • typescript');
  assert.equal(getStatusBarActions(snapshot)[0]?.action, 'reconnect-desktop');
});

test('connected runtime actions keep refresh and desktop open available', () => {
  const actions = getStatusBarActions(createSnapshot({ displayState: 'active', connectionState: 'connected' }));
  assert.deepEqual(actions.map((action) => action.action), [
    'refresh-settings',
    'open-desktop',
    'show-status',
    'show-output',
  ]);
});

function createSnapshot(overrides: Partial<RuntimeStatusSnapshot>): RuntimeStatusSnapshot {
  return {
    connectionState: 'connected',
    displayState: 'active',
    detail: 'Connected',
    todayTrackedMinutes: 84,
    currentSessionMinutes: 12,
    currentSessionActive: false,
    currentSessionStartedAt: undefined,
    currentSessionLastActivityAt: undefined,
    activeFilePath: undefined,
    activeLanguage: undefined,
    trackingEnabled: true,
    queueSize: 0,
    focused: true,
    trackOnlyWhenFocused: false,
    bufferingEnabled: true,
    heartbeatIntervalSeconds: 30,
    filePathMode: 'masked',
    machineName: 'Kairos Dev Machine',
    extensionVersion: '0.1.0',
    lastHandshakeAt: undefined,
    lastSuccessfulSendAt: undefined,
    lastEventAt: undefined,
    outboxSizeBytes: 0,
    outboxThresholdState: 'normal',
    captureBlockedByHardCap: false,
    outboxSoftThresholdBytes: 100 * 1024 * 1024,
    outboxWarningThresholdBytes: 250 * 1024 * 1024,
    outboxHardCapBytes: 500 * 1024 * 1024,
    ...overrides,
  };
}
