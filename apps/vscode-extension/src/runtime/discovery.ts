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
};

function resolveDiscoveryFilePath(): string {
  const override = process.env[BRIDGE_DISCOVERY_FILE_ENV]?.trim();
  if (override) {
    return override;
  }
  return path.join(os.homedir(), '.kairos', 'desktop-bridge.json');
}

function tryReadDiscoveredDesktopURL(): string | undefined {
  const discoveryFile = resolveDiscoveryFilePath();
  try {
    const decoded = JSON.parse(fs.readFileSync(discoveryFile, 'utf8')) as BridgeDiscoveryRecord;
    if (decoded.desktopServerUrl?.startsWith('http://127.0.0.1:')) {
      return decoded.desktopServerUrl;
    }
    if (decoded.desktopServerHost && Number.isFinite(decoded.desktopServerPort)) {
      return `http://${decoded.desktopServerHost}:${decoded.desktopServerPort}`;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function pushUnique(values: string[], candidate: string | undefined): void {
  if (!candidate) {
    return;
  }
  if (!values.includes(candidate)) {
    values.push(candidate);
  }
}

export function buildDesktopBaseURLCandidates(preferredBaseURL?: string): string[] {
  const candidates: string[] = [];

  pushUnique(candidates, preferredBaseURL?.trim());
  pushUnique(candidates, process.env.KAIROS_DESKTOP_URL?.trim());
  pushUnique(candidates, tryReadDiscoveredDesktopURL());
  pushUnique(candidates, DESKTOP_BASE_URL);

  for (let port = DESKTOP_PORT_RANGE_START; port <= DESKTOP_PORT_RANGE_END; port += 1) {
    pushUnique(candidates, `http://127.0.0.1:${port}`);
  }

  return candidates;
}
