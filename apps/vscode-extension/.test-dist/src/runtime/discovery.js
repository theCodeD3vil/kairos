"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildDesktopEndpointCandidates = buildDesktopEndpointCandidates;
exports.buildDesktopBaseURLCandidates = buildDesktopBaseURLCandidates;
const node_fs_1 = __importDefault(require("node:fs"));
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const constants_1 = require("./constants");
function resolveDiscoveryFilePath() {
    const override = process.env[constants_1.BRIDGE_DISCOVERY_FILE_ENV]?.trim();
    if (override) {
        return override;
    }
    return node_path_1.default.join(node_os_1.default.homedir(), '.kairos', 'desktop-bridge.json');
}
function tryReadDiscoveredDesktopCandidate() {
    const discoveryFile = resolveDiscoveryFilePath();
    try {
        const decoded = JSON.parse(node_fs_1.default.readFileSync(discoveryFile, 'utf8'));
        const token = decoded.desktopServerToken?.trim() || undefined;
        const loopbackURL = parseLoopbackURL(decoded.desktopServerUrl);
        if (loopbackURL) {
            return { baseURL: loopbackURL, token };
        }
        const host = decoded.desktopServerHost?.trim();
        const port = decoded.desktopServerPort;
        if (host && typeof port === 'number' && Number.isInteger(port) && isValidPort(port) && isLoopbackHost(host)) {
            return { baseURL: `http://${formatHostForURL(host)}:${port}`, token };
        }
        return undefined;
    }
    catch {
        return undefined;
    }
}
function pushUniqueCandidate(candidates, candidate) {
    if (!candidate || !candidate.baseURL) {
        return;
    }
    if (candidates.some((existing) => existing.baseURL === candidate.baseURL)) {
        return;
    }
    candidates.push(candidate);
}
function buildDesktopEndpointCandidates(preferredBaseURL) {
    const candidates = [];
    const envToken = process.env.KAIROS_DESKTOP_TOKEN?.trim() || undefined;
    const envDesktopURL = process.env.KAIROS_DESKTOP_URL?.trim();
    const preferredURL = preferredBaseURL?.trim();
    pushUniqueCandidate(candidates, preferredURL ? { baseURL: preferredURL, token: envToken } : undefined);
    pushUniqueCandidate(candidates, envDesktopURL ? { baseURL: envDesktopURL, token: envToken } : undefined);
    pushUniqueCandidate(candidates, tryReadDiscoveredDesktopCandidate());
    pushUniqueCandidate(candidates, { baseURL: constants_1.DESKTOP_BASE_URL, token: envToken });
    for (let port = constants_1.DESKTOP_PORT_RANGE_START; port <= constants_1.DESKTOP_PORT_RANGE_END; port += 1) {
        pushUniqueCandidate(candidates, { baseURL: `http://127.0.0.1:${port}`, token: envToken });
    }
    return candidates;
}
function buildDesktopBaseURLCandidates(preferredBaseURL) {
    return buildDesktopEndpointCandidates(preferredBaseURL).map((candidate) => candidate.baseURL);
}
function parseLoopbackURL(raw) {
    if (!raw) {
        return undefined;
    }
    try {
        const parsed = new URL(raw);
        if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || !isLoopbackHost(parsed.hostname)) {
            return undefined;
        }
        return parsed.origin;
    }
    catch {
        return undefined;
    }
}
function isValidPort(port) {
    return port > 0 && port <= 65535;
}
function isLoopbackHost(host) {
    const trimmed = host.trim().toLowerCase();
    const normalized = trimmed.startsWith('[') && trimmed.endsWith(']')
        ? trimmed.slice(1, -1)
        : trimmed;
    return normalized === 'localhost' || normalized === '::1' || normalized.startsWith('127.');
}
function formatHostForURL(host) {
    const trimmed = host.trim();
    if (trimmed.includes(':') && !trimmed.startsWith('[')) {
        return `[${trimmed}]`;
    }
    return trimmed;
}
//# sourceMappingURL=discovery.js.map