import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
  BRIDGE_DISCOVERY_FILE_ENV,
  DESKTOP_BASE_URL,
  DESKTOP_PORT_RANGE_END,
  DESKTOP_PORT_RANGE_START,
} from './constants';

type BridgeDiscoveryRecord = {
  desktopServerUrl?: string;
  desktopServerHost?: string;
  desktopServerPort?: number;
  desktopServerToken?: string;
};

export type DesktopEndpointCandidate = {
  baseURL: string;
  token?: string;
};

function resolveDiscoveryFilePath(): string {
  const override = process.env[BRIDGE_DISCOVERY_FILE_ENV]?.trim();
  if (override) {
    return override;
  }
  return path.join(os.homedir(), '.kairos', 'desktop-bridge.json');
}

function tryReadDiscoveredDesktopCandidate(): DesktopEndpointCandidate | undefined {
  const discoveryFile = resolveDiscoveryFilePath();
  try {
    const decoded = JSON.parse(fs.readFileSync(discoveryFile, 'utf8')) as BridgeDiscoveryRecord;
    const token = decoded.desktopServerToken?.trim() || undefined;
    if (decoded.desktopServerUrl?.startsWith('http://127.0.0.1:')) {
      return { baseURL: decoded.desktopServerUrl, token };
    }
    if (decoded.desktopServerHost && Number.isFinite(decoded.desktopServerPort)) {
      return { baseURL: `http://${decoded.desktopServerHost}:${decoded.desktopServerPort}`, token };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function pushUniqueCandidate(candidates: DesktopEndpointCandidate[], candidate: DesktopEndpointCandidate | undefined): void {
  if (!candidate || !candidate.baseURL) {
    return;
  }

  const normalized = normalizeCandidate(candidate);
  if (!normalized.baseURL) {
    return;
  }
  if (candidates.some((existing) => sameCandidate(existing, normalized))) {
    return;
  }
  candidates.push(normalized);
}

function normalizeCandidate(candidate: DesktopEndpointCandidate): DesktopEndpointCandidate {
  return {
    baseURL: candidate.baseURL.trim(),
    token: candidate.token?.trim() || undefined,
  };
}

function sameCandidate(a: DesktopEndpointCandidate, b: DesktopEndpointCandidate): boolean {
  return a.baseURL === b.baseURL && (a.token ?? '') === (b.token ?? '');
}

export function buildDesktopEndpointCandidates(preferredBaseURL?: string): DesktopEndpointCandidate[] {
  const candidates: DesktopEndpointCandidate[] = [];
  const envToken = process.env.KAIROS_DESKTOP_TOKEN?.trim() || undefined;
  const envDesktopURL = process.env.KAIROS_DESKTOP_URL?.trim();
  const preferredURL = preferredBaseURL?.trim();

  pushUniqueCandidate(candidates, preferredURL ? { baseURL: preferredURL, token: envToken } : undefined);
  pushUniqueCandidate(candidates, envDesktopURL ? { baseURL: envDesktopURL, token: envToken } : undefined);
  pushUniqueCandidate(candidates, tryReadDiscoveredDesktopCandidate());
  pushUniqueCandidate(candidates, { baseURL: DESKTOP_BASE_URL, token: envToken });

  for (let port = DESKTOP_PORT_RANGE_START; port <= DESKTOP_PORT_RANGE_END; port += 1) {
    pushUniqueCandidate(candidates, { baseURL: `http://127.0.0.1:${port}`, token: envToken });
  }

  return candidates;
}

export function buildDesktopBaseURLCandidates(preferredBaseURL?: string): string[] {
  return buildDesktopEndpointCandidates(preferredBaseURL).map((candidate) => candidate.baseURL);
}
