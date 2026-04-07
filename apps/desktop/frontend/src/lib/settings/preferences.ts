import type { DateRange } from '@/components/ruixen/range-calendar';
import type { OverviewRange } from '@/components/overview/types';
import type { GeneralSettings } from '@/data/mockSettings';

export const LAST_PAGE_STORAGE_KEY = 'kairos:last-page';

const lastRangeStorageKeys = {
  overview: 'kairos:last-range:overview',
  sessions: 'kairos:last-range:sessions',
  analytics: 'kairos:last-range:analytics',
} as const;

type LastRangeKey = keyof typeof lastRangeStorageKeys;

type SerializedRangePreference = {
  range: OverviewRange;
  customStart?: string;
  customEnd?: string;
};

export function getRangeStorageKey(key: LastRangeKey): string {
  return lastRangeStorageKeys[key];
}

export function saveRangePreference(storageKey: string, range: OverviewRange, customRange: DateRange | null): void {
  const payload: SerializedRangePreference = { range };
  if (range === 'custom' && customRange) {
    payload.customStart = customRange.start.toISOString();
    payload.customEnd = customRange.end.toISOString();
  }
  localStorage.setItem(storageKey, JSON.stringify(payload));
}

export function readRangePreference(storageKey: string): { range: OverviewRange; customRange: DateRange | null } | null {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    const decoded = JSON.parse(raw) as SerializedRangePreference;
    if (!decoded || !isOverviewRange(decoded.range)) {
      return null;
    }

    if (decoded.range !== 'custom') {
      return { range: decoded.range, customRange: null };
    }

    if (!decoded.customStart || !decoded.customEnd) {
      return null;
    }

    const start = new Date(decoded.customStart);
    const end = new Date(decoded.customEnd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return null;
    }

    return {
      range: 'custom',
      customRange: { start, end },
    };
  } catch {
    return null;
  }
}

export function resolveInitialPagePath(rememberLastPage: boolean, landingPage: GeneralSettings['landingPage']): string {
  if (rememberLastPage) {
    const lastPage = localStorage.getItem(LAST_PAGE_STORAGE_KEY);
    if (isPagePath(lastPage)) {
      return lastPage;
    }
  }
  return `/${landingPage}`;
}

function isOverviewRange(value: unknown): value is OverviewRange {
  return value === 'today' || value === 'week' || value === 'month' || value === 'custom';
}

function isPagePath(value: string | null): value is '/overview' | '/analytics' | '/sessions' | '/calendar' | '/settings' {
  return value === '/overview'
    || value === '/analytics'
    || value === '/sessions'
    || value === '/calendar'
    || value === '/settings';
}
