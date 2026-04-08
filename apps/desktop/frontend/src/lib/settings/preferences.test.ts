import { beforeEach, describe, expect, it } from 'vitest';
import {
  LAST_PAGE_STORAGE_KEY,
  readRangePreference,
  resolveInitialPagePath,
  saveRangePreference,
} from '@/lib/settings/preferences';

type MemoryStorage = {
  clear: () => void;
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
  setItem: (key: string, value: string) => void;
};

function createMemoryStorage(): MemoryStorage {
  const values = new Map<string, string>();
  return {
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    removeItem: (key: string) => {
      values.delete(key);
    },
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe('preferences', () => {
  const storage = createMemoryStorage();

  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: storage,
      writable: true,
    });
    storage.clear();
  });

  it('uses last page when rememberLastPage is enabled and stored path is valid', () => {
    localStorage.setItem(LAST_PAGE_STORAGE_KEY, '/sessions');
    expect(resolveInitialPagePath(true, 'overview')).toBe('/sessions');
  });

  it('falls back to landing page when remembered path is invalid', () => {
    localStorage.setItem(LAST_PAGE_STORAGE_KEY, '/not-a-real-route');
    expect(resolveInitialPagePath(true, 'analytics')).toBe('/analytics');
  });

  it('ignores remembered path when rememberLastPage is disabled', () => {
    localStorage.setItem(LAST_PAGE_STORAGE_KEY, '/settings');
    expect(resolveInitialPagePath(false, 'overview')).toBe('/overview');
  });

  it('round-trips custom range preferences', () => {
    const start = new Date('2026-04-01T00:00:00.000Z');
    const end = new Date('2026-04-08T00:00:00.000Z');
    saveRangePreference('kairos:test-range', 'custom', { start, end });

    const decoded = readRangePreference('kairos:test-range');
    expect(decoded?.range).toBe('custom');
    expect(decoded?.customRange?.start.toISOString()).toBe(start.toISOString());
    expect(decoded?.customRange?.end.toISOString()).toBe(end.toISOString());
  });
});

