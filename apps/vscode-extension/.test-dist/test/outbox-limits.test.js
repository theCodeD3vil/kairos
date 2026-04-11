"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const filters_1 = require("../src/runtime/filters");
const outbox_limits_1 = require("../src/runtime/outbox-limits");
(0, node_test_1.default)('outbox threshold defaults are explicit and centralized', () => {
    strict_1.default.equal(outbox_limits_1.DEFAULT_OUTBOX_SOFT_THRESHOLD_BYTES, 100 * 1024 * 1024);
    strict_1.default.equal(outbox_limits_1.DEFAULT_OUTBOX_WARNING_THRESHOLD_BYTES, 250 * 1024 * 1024);
    strict_1.default.equal(outbox_limits_1.DEFAULT_OUTBOX_HARD_CAP_BYTES, 500 * 1024 * 1024);
    strict_1.default.deepEqual(outbox_limits_1.DEFAULT_OUTBOX_THRESHOLDS, {
        softThresholdBytes: 100 * 1024 * 1024,
        warningThresholdBytes: 250 * 1024 * 1024,
        hardCapBytes: 500 * 1024 * 1024,
    });
});
(0, node_test_1.default)('threshold classification behavior follows soft warning hard ordering', () => {
    const thresholds = outbox_limits_1.DEFAULT_OUTBOX_THRESHOLDS;
    strict_1.default.equal((0, outbox_limits_1.classifyOutboxThresholdState)(0, thresholds), 'normal');
    strict_1.default.equal((0, outbox_limits_1.classifyOutboxThresholdState)(thresholds.softThresholdBytes, thresholds), 'soft');
    strict_1.default.equal((0, outbox_limits_1.classifyOutboxThresholdState)(thresholds.warningThresholdBytes, thresholds), 'warning');
    strict_1.default.equal((0, outbox_limits_1.classifyOutboxThresholdState)(thresholds.hardCapBytes, thresholds), 'hard');
});
(0, node_test_1.default)('hard-cap override from effective settings is applied and normalized', () => {
    const settings = {
        ...(0, filters_1.getDefaultEffectiveSettings)(),
        outboxHardCapBytes: 60 * 1024 * 1024,
    };
    const thresholds = (0, outbox_limits_1.resolveOutboxThresholds)(settings);
    strict_1.default.equal(thresholds.hardCapBytes, 60 * 1024 * 1024);
    strict_1.default.equal(thresholds.warningThresholdBytes, 60 * 1024 * 1024);
    strict_1.default.equal(thresholds.softThresholdBytes, 60 * 1024 * 1024);
});
(0, node_test_1.default)('limit status exposes warning and hard-cap blocking state', () => {
    const settings = (0, filters_1.getDefaultEffectiveSettings)();
    const warningStatus = (0, outbox_limits_1.buildOutboxLimitStatus)(outbox_limits_1.DEFAULT_OUTBOX_WARNING_THRESHOLD_BYTES, settings);
    strict_1.default.equal(warningStatus.thresholdState, 'warning');
    strict_1.default.equal(warningStatus.captureBlockedByHardCap, false);
    const hardStatus = (0, outbox_limits_1.buildOutboxLimitStatus)(outbox_limits_1.DEFAULT_OUTBOX_HARD_CAP_BYTES, settings);
    strict_1.default.equal(hardStatus.thresholdState, 'hard');
    strict_1.default.equal(hardStatus.captureBlockedByHardCap, true);
});
//# sourceMappingURL=outbox-limits.test.js.map