"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const statusbar_1 = require("../src/statusbar");
(0, node_test_1.default)('formatDuration renders compact today labels', () => {
    strict_1.default.equal((0, statusbar_1.formatDuration)(12), '12m');
    strict_1.default.equal((0, statusbar_1.formatDuration)(68), '1h 08m');
    strict_1.default.equal((0, statusbar_1.formatDuration)(272), '4h 32m');
});
(0, node_test_1.default)('buildStatusBarText selects concise state-aware labels', () => {
    strict_1.default.equal((0, statusbar_1.buildStatusBarText)(createSnapshot({ displayState: 'active', todayTrackedMinutes: 84 })), 'Kairos: 1h 24m today');
    strict_1.default.equal((0, statusbar_1.buildStatusBarText)(createSnapshot({ displayState: 'tracking-disabled' })), 'Kairos: Tracking off');
    strict_1.default.equal((0, statusbar_1.buildStatusBarText)(createSnapshot({ displayState: 'disconnected', connectionState: 'disconnected' })), 'Kairos: Disconnected');
    strict_1.default.equal((0, statusbar_1.buildStatusBarText)(createSnapshot({ displayState: 'buffering', connectionState: 'offline-buffering' })), 'Kairos: Buffering');
    strict_1.default.equal((0, statusbar_1.buildStatusBarText)(createSnapshot({ displayState: 'idle' })), 'Kairos: Idle');
});
(0, node_test_1.default)('buildStatusBarTooltip includes the main runtime detail fields', () => {
    const tooltip = (0, statusbar_1.buildStatusBarTooltip)(createSnapshot({
        displayState: 'buffering',
        connectionState: 'offline-buffering',
        queueSize: 7,
        lastHandshakeAt: '2026-04-06T10:00:00Z',
        lastSuccessfulSendAt: '2026-04-06T10:05:00Z',
        lastEventAt: '2026-04-06T10:06:00Z',
    }));
    strict_1.default.match(tooltip, /Today: \*\*1h 24m\*\*/);
    strict_1.default.match(tooltip, /State: \*\*Offline buffering\*\*/);
    strict_1.default.match(tooltip, /Connection: \*\*Buffering offline\*\*/);
    strict_1.default.match(tooltip, /Buffered events: \*\*7\*\*/);
    strict_1.default.match(tooltip, /Outbox size:/);
    strict_1.default.match(tooltip, /Outbox state:/);
    strict_1.default.match(tooltip, /Last handshake:/);
    strict_1.default.match(tooltip, /Last successful send:/);
    strict_1.default.match(tooltip, /Last event:/);
});
(0, node_test_1.default)('buildStatusSummary and action list adapt to disconnected runtime state', () => {
    const snapshot = createSnapshot({
        displayState: 'disconnected',
        connectionState: 'disconnected',
        queueSize: 3,
    });
    strict_1.default.equal((0, statusbar_1.buildStatusSummary)(snapshot), 'Today 1h 24m • Disconnected • Disconnected • 3 buffered');
    strict_1.default.equal((0, statusbar_1.getStatusBarActions)(snapshot)[0]?.action, 'reconnect-desktop');
});
(0, node_test_1.default)('connected runtime actions keep refresh and desktop open available', () => {
    const actions = (0, statusbar_1.getStatusBarActions)(createSnapshot({ displayState: 'active', connectionState: 'connected' }));
    strict_1.default.deepEqual(actions.map((action) => action.action), [
        'refresh-settings',
        'open-desktop',
        'show-status',
        'show-output',
    ]);
});
function createSnapshot(overrides) {
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
        outboxSizeBytes: 0,
        outboxThresholdState: 'normal',
        captureBlockedByHardCap: false,
        outboxSoftThresholdBytes: 100 * 1024 * 1024,
        outboxWarningThresholdBytes: 250 * 1024 * 1024,
        outboxHardCapBytes: 500 * 1024 * 1024,
        ...overrides,
    };
}
//# sourceMappingURL=statusbar.test.js.map