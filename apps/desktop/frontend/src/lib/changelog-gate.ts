const CHANGELOG_LAST_SEEN_VERSION_KEY = 'kairos:changelog:last-seen-version';

export function normalizeAppVersion(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return '';
  }
  return trimmed.startsWith('v') ? trimmed.slice(1) : trimmed;
}

export function shouldAutoOpenChangelog(currentVersion: string, lastSeenVersion: string | null): boolean {
  const current = normalizeAppVersion(currentVersion);
  if (!current) {
    return false;
  }
  const seen = normalizeAppVersion(lastSeenVersion);
  return current !== seen;
}

export function readLastSeenChangelogVersion(): string | null {
  try {
    return window.localStorage.getItem(CHANGELOG_LAST_SEEN_VERSION_KEY);
  } catch {
    return null;
  }
}

export function writeLastSeenChangelogVersion(version: string): void {
  const normalized = normalizeAppVersion(version);
  if (!normalized) {
    return;
  }
  try {
    window.localStorage.setItem(CHANGELOG_LAST_SEEN_VERSION_KEY, normalized);
  } catch {
    // Ignore storage failures.
  }
}
