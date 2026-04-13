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
    strict_1.default.equal((0, statusbar_1.buildStatusBarText)(createSnapshot({ displayState: 'active', todayTrackedMinutes: 84 })), '$(code) 1h 24m');
    strict_1.default.equal((0, statusbar_1.buildStatusBarText)(createSnapshot({ displayState: 'tracking-disabled' })), '$(code) 1h 24m');
    strict_1.default.equal((0, statusbar_1.buildStatusBarText)(createSnapshot({ displayState: 'disconnected', connectionState: 'disconnected' })), '$(code) 1h 24m');
    strict_1.default.equal((0, statusbar_1.buildStatusBarText)(createSnapshot({ displayState: 'buffering', connectionState: 'offline-buffering' })), '$(code) 1h 24m');
    strict_1.default.equal((0, statusbar_1.buildStatusBarText)(createSnapshot({ displayState: 'idle' })), '$(code) 1h 24m');
});
(0, node_test_1.default)('buildStatusBarTooltip focuses on coding session details', () => {
    const tooltip = (0, statusbar_1.buildStatusBarTooltip)(createSnapshot({
        displayState: 'active',
        currentSessionMinutes: 42,
        currentSessionActive: true,
        currentSessionStartedAt: '2026-04-06T10:00:00Z',
        currentSessionLastActivityAt: '2026-04-06T10:06:00Z',
        activeFilePath: '/workspace/kairos/src/runtime/runtime.ts',
        activeLanguage: 'typescript',
    }));
    strict_1.default.match(tooltip, /\*\*Kairos Coding Session\*\*/);
    strict_1.default.match(tooltip, /Today: \*\*1h 24m\*\*/);
    strict_1.default.match(tooltip, /Current session: \*\*42m\*\*/);
    strict_1.default.match(tooltip, /Session: \*\*Live\*\*/);
    strict_1.default.match(tooltip, /Started:/);
    strict_1.default.match(tooltip, /Last activity:/);
    strict_1.default.match(tooltip, /File: \*\*\\\.\\\.\\\.\/runtime\/runtime\\.ts\*\*/);
    strict_1.default.match(tooltip, /Language: \*\*typescript\*\*/);
});
(0, node_test_1.default)('buildStatusSummary and action list adapt to disconnected runtime state', () => {
    const snapshot = createSnapshot({
        displayState: 'disconnected',
        connectionState: 'disconnected',
        currentSessionMinutes: 23,
        currentSessionActive: false,
        activeLanguage: 'typescript',
    });
    strict_1.default.equal((0, statusbar_1.buildStatusSummary)(snapshot), 'Today 1h 24m • Session 23m • Paused • typescript');
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
//# sourceMappingURL=statusbar.test.js.map