import type { DateRange } from '@/components/ruixen/range-calendar';
import type { OverviewRange } from '@/components/overview/types';
import type { GeneralSettings } from '@/data/mockSettings';

export const LAST_PAGE_STORAGE_KEY = 'kairos:last-page';
export const REOPEN_LAST_VIEWED_CONTEXT_STORAGE_KEY = 'kairos:reopen-last-viewed-context';
export const LAST_CALENDAR_MONTH_STORAGE_KEY = 'kairos:last-calendar-month';
export const LAST_ANALYTICS_FILTERS_STORAGE_KEY = 'kairos:last-analytics-filters';

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

type SerializedCalendarMonthPreference = {
  year: number;
  month: number;
};

type AnalyticsContextPreference = {
  project: string;
  language: string;
  machine: string;
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

export function saveReopenLastViewedContextPreference(enabled: boolean): void {
  localStorage.setItem(REOPEN_LAST_VIEWED_CONTEXT_STORAGE_KEY, JSON.stringify(enabled));
}

export function readReopenLastViewedContextPreference(fallback = true): boolean {
  const raw = localStorage.getItem(REOPEN_LAST_VIEWED_CONTEXT_STORAGE_KEY);
  if (!raw) {
    return fallback;
  }

  try {
    const decoded = JSON.parse(raw) as unknown;
    return typeof decoded === 'boolean' ? decoded : fallback;
  } catch {
    return fallback;
  }
}

export function saveCalendarMonthPreference(monthRef: Date): void {
  const payload: SerializedCalendarMonthPreference = {
    year: monthRef.getFullYear(),
    month: monthRef.getMonth() + 1,
  };
  localStorage.setItem(LAST_CALENDAR_MONTH_STORAGE_KEY, JSON.stringify(payload));
}

export function readCalendarMonthPreference(): Date | null {
  const raw = localStorage.getItem(LAST_CALENDAR_MONTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const decoded = JSON.parse(raw) as SerializedCalendarMonthPreference;
    if (!decoded) {
      return null;
    }
    if (!Number.isFinite(decoded.year) || !Number.isFinite(decoded.month)) {
      return null;
    }
    const year = Math.trunc(decoded.year);
    const month = Math.trunc(decoded.month);
    if (month < 1 || month > 12) {
      return null;
    }
    return new Date(year, month - 1, 1);
  } catch {
    return null;
  }
}

export function saveAnalyticsContextPreference(input: AnalyticsContextPreference): void {
  localStorage.setItem(LAST_ANALYTICS_FILTERS_STORAGE_KEY, JSON.stringify(input));
}

export function readAnalyticsContextPreference(): AnalyticsContextPreference | null {
  const raw = localStorage.getItem(LAST_ANALYTICS_FILTERS_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const decoded = JSON.parse(raw) as Partial<AnalyticsContextPreference>;
    if (!decoded) {
      return null;
    }
    if (typeof decoded.project !== 'string' || typeof decoded.language !== 'string' || typeof decoded.machine !== 'string') {
      return null;
    }
    return {
      project: decoded.project,
      language: decoded.language,
      machine: decoded.machine,
    };
  } catch {
    return null;
  }
}
