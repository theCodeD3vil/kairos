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
  assert.equal(buildStatusBarText(createSnapshot({ displayState: 'active', todayTrackedMinutes: 84 })), 'Kairos: 1h 24m today');
  assert.equal(buildStatusBarText(createSnapshot({ displayState: 'tracking-disabled' })), 'Kairos: Tracking off');
  assert.equal(buildStatusBarText(createSnapshot({ displayState: 'disconnected', connectionState: 'disconnected' })), 'Kairos: Disconnected');
  assert.equal(buildStatusBarText(createSnapshot({ displayState: 'buffering', connectionState: 'offline-buffering' })), 'Kairos: Buffering');
  assert.equal(buildStatusBarText(createSnapshot({ displayState: 'idle' })), 'Kairos: Idle');
});

test('buildStatusBarTooltip includes the main runtime detail fields', () => {
  const tooltip = buildStatusBarTooltip(
    createSnapshot({
      displayState: 'buffering',
      connectionState: 'offline-buffering',
      queueSize: 7,
      lastHandshakeAt: '2026-04-06T10:00:00Z',
      lastSuccessfulSendAt: '2026-04-06T10:05:00Z',
      lastEventAt: '2026-04-06T10:06:00Z',
    }),
  );

  assert.match(tooltip, /Today: \*\*1h 24m\*\*/);
  assert.match(tooltip, /State: \*\*Offline buffering\*\*/);
  assert.match(tooltip, /Connection: \*\*Buffering offline\*\*/);
  assert.match(tooltip, /Buffered events: \*\*7\*\*/);
  assert.match(tooltip, /Last handshake:/);
  assert.match(tooltip, /Last successful send:/);
  assert.match(tooltip, /Last event:/);
});

test('buildStatusSummary and action list adapt to disconnected runtime state', () => {
  const snapshot = createSnapshot({
    displayState: 'disconnected',
    connectionState: 'disconnected',
    queueSize: 3,
  });

  assert.equal(buildStatusSummary(snapshot), 'Today 1h 24m • Disconnected • Disconnected • 3 buffered');
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
    ...overrides,
  };
}
