import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import type { DateRange } from '@/components/ruixen/range-calendar';
import { presetOverviewRanges, type OverviewRange } from '@/components/overview/types';
import type { AnalyticsFilters } from '@/data/mockAnalytics';
import {
  loadAnalyticsSnapshot,
  loadCalendarDay,
  loadCalendarMonth,
  loadOverviewSnapshot,
  loadSessionsScreenData,
} from '@/lib/backend/page-data';
import { loadSettingsScreenData, probeVSCodeExtensionStatus, type SettingsScreenData } from '@/lib/backend/settings';
import {
  getRangeStorageKey,
  readAnalyticsContextPreference,
  readCalendarMonthPreference,
  resolveInitialRangePreference,
  resolveInitialPagePath,
} from '@/lib/settings/preferences';

export const DATA_REFRESH_INTERVAL_MS = 60_000;
const EXTENSION_PROBE_INTERVAL_MS = DATA_REFRESH_INTERVAL_MS;
const FOCUS_REFRESH_THROTTLE_MS = 2_000;

export type DesktopRefreshReason = 'poll' | 'event' | 'manual' | 'query';
export type DesktopRefreshSignal = {
  reason: DesktopRefreshReason;
  revision: number;
  kind?: string;
};

type DesktopDataContextValue = {
  bootstrapped: boolean;
  backgroundSyncing: boolean;
  registerRefresher: (key: string, refresher: (signal: DesktopRefreshSignal) => Promise<void> | void) => () => void;
};

type DesktopCacheResource = {
  key: string;
  load: () => Promise<unknown>;
};

type StoredRangeSelection = {
  range: OverviewRange;
  customRange: DateRange | null;
};

const DesktopDataContext = createContext<DesktopDataContextValue | null>(null);
const desktopDataCache = new Map<string, unknown>();
const dataChangedEventName = 'kairos:data-changed';
const desktopWarmupConcurrency = 4;

function mergeRefreshReason(
  current: DesktopRefreshReason | null,
  next: DesktopRefreshReason,
): DesktopRefreshReason {
  if (!current) {
    return next;
  }

  const priority: Record<DesktopRefreshReason, number> = {
    poll: 0,
    event: 1,
    query: 2,
    manual: 3,
  };
  return priority[next] >= priority[current] ? next : current;
}

function normalizeRevision(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function mergeRefreshSignal(
  current: DesktopRefreshSignal | null,
  next: DesktopRefreshSignal,
): DesktopRefreshSignal {
  if (!current) {
    return next;
  }

  return {
    reason: mergeRefreshReason(current.reason, next.reason),
    revision: Math.max(current.revision, next.revision),
    kind: mergeRefreshKind(current.kind, next.kind),
  };
}

function extractEventRevision(args: unknown[]): number | null {
  for (const arg of args) {
    if (!arg || typeof arg !== 'object') {
      continue;
    }
    const revision = normalizeRevision((arg as { revision?: unknown }).revision);
    if (revision !== null) {
      return revision;
    }
  }
  return null;
}

function extractEventKind(args: unknown[]): string | undefined {
  for (const arg of args) {
    if (!arg || typeof arg !== 'object') {
      continue;
    }
    const candidate = (arg as { kind?: unknown }).kind;
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim().toLowerCase();
    }
  }

  for (const arg of args) {
    if (typeof arg === 'string' && arg.trim()) {
      return arg.trim().toLowerCase();
    }
  }

  return undefined;
}

function mergeRefreshKind(current?: string, next?: string): string | undefined {
  const currentKind = current?.trim().toLowerCase();
  const nextKind = next?.trim().toLowerCase();
  if (!currentKind || !nextKind) {
    return undefined;
  }
  if (currentKind === nextKind) {
    return currentKind;
  }
  // Different event kinds were coalesced; fall back to broad refresh.
  return undefined;
}

function matchesEventKindToResourceKey(key: string, kind?: string): boolean {
  const normalizedKind = kind?.trim().toLowerCase();
  if (!normalizedKind) {
    return true;
  }

  const isSettings = key === desktopResourceKeys.settings();
  const isOverview = key.startsWith('overview:');
  const isAnalytics = key.startsWith('analytics:');
  const isSessions = key.startsWith('sessions:');
  const isCalendar = key.startsWith('calendar:');

  switch (normalizedKind) {
    case 'extension-status':
      return isSettings || isOverview;
    case 'activity':
    case 'sessions':
      return isOverview || isAnalytics || isSessions || isCalendar;
    case 'events':
      return isSettings || isOverview || isAnalytics || isSessions || isCalendar;
    case 'settings':
      return true;
    default:
      return true;
  }
}

function isBackgroundSyncReason(reason: DesktopRefreshReason): boolean {
  return reason === 'poll' || reason === 'event' || reason === 'manual';
}

export const desktopResourceKeys = {
  analytics(filters: AnalyticsFilters) {
    return `analytics:${JSON.stringify(filters)}`;
  },
  calendarDay(date: string) {
    return `calendar:day:${date}`;
  },
  calendarMonth(year: number, month: number) {
    return `calendar:month:${year}-${String(month + 1).padStart(2, '0')}`;
  },
  overview(range: OverviewRange, customRange: DateRange | null) {
    return `overview:${range}:${customRange ? `${customRange.start.toISOString()}..${customRange.end.toISOString()}` : 'default'}`;
  },
  sessions(range: OverviewRange, customRange: DateRange | null) {
    return `sessions:${range}:${customRange ? `${customRange.start.toISOString()}..${customRange.end.toISOString()}` : 'default'}`;
  },
  settings() {
    return 'settings';
  },
} as const;

export function getCachedDesktopResource<T>(key: string): T | undefined {
  return desktopDataCache.get(key) as T | undefined;
}

export function setCachedDesktopResource<T>(key: string, value: T): void {
  desktopDataCache.set(key, value);
}

function currentMonthRef() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    today: now.toISOString().slice(0, 10),
  };
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isSameMonth(left: Date, right: Date) {
  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
}

function resourceForSettings(settings: SettingsScreenData | null): DesktopCacheResource {
  return {
    key: desktopResourceKeys.settings(),
    load: () => settings ? Promise.resolve(settings) : loadSettingsScreenData({ quiet: true }),
  };
}

function resourceForOverview(range: OverviewRange, customRange: DateRange | null): DesktopCacheResource {
  return {
    key: desktopResourceKeys.overview(range, customRange),
    load: () => loadOverviewSnapshot(range, customRange, { quiet: true }),
  };
}

function resourceForAnalytics(filters: AnalyticsFilters): DesktopCacheResource {
  return {
    key: desktopResourceKeys.analytics(filters),
    load: () => loadAnalyticsSnapshot(filters, { quiet: true }),
  };
}

function resourceForSessions(range: OverviewRange, customRange: DateRange | null): DesktopCacheResource {
  return {
    key: desktopResourceKeys.sessions(range, customRange),
    load: () => loadSessionsScreenData(range, customRange, { quiet: true }),
  };
}

function resourceForCalendarMonth(year: number, month: number): DesktopCacheResource {
  return {
    key: desktopResourceKeys.calendarMonth(year, month),
    load: () => loadCalendarMonth(year, month, { quiet: true }),
  };
}

function resourceForCalendarDay(date: string): DesktopCacheResource {
  return {
    key: desktopResourceKeys.calendarDay(date),
    load: () => loadCalendarDay(date, { quiet: true }),
  };
}

function storedRangeSelection(
  key: 'overview' | 'analytics' | 'sessions',
  settings: SettingsScreenData,
): StoredRangeSelection {
  return resolveInitialRangePreference(
    getRangeStorageKey(key),
    settings.viewModel.appBehavior.restoreLastSelectedDateRange,
    settings.viewModel.general.defaultDateRange,
  );
}

function startupPath(settings: SettingsScreenData): string {
  const hashPath = window.location.hash.replace(/^#/, '').split(/[?#]/)[0] || '/';
  if (hashPath !== '/') {
    return hashPath;
  }

  return resolveInitialPagePath(
    settings.viewModel.appBehavior.rememberLastSelectedPage,
    settings.viewModel.general.landingPage,
  );
}

function startupAnalyticsFilters(settings: SettingsScreenData): AnalyticsFilters {
  const range = storedRangeSelection('analytics', settings);
  const context = settings.viewModel.appBehavior.reopenLastViewedContext
    ? readAnalyticsContextPreference()
    : null;

  return {
    range: range.range,
    customRange: range.customRange,
    project: context?.project ?? 'all',
    language: context?.language ?? 'all',
    machine: context?.machine ?? 'all',
  };
}

function startupMonthRef(settings: SettingsScreenData): Date {
  if (settings.viewModel.appBehavior.reopenLastViewedContext) {
    const savedMonth = readCalendarMonthPreference();
    if (savedMonth) {
      return savedMonth;
    }
  }

  return new Date();
}

function startupCalendarDay(monthRef: Date): string {
  const today = new Date();
  return isSameMonth(monthRef, today) ? formatDateKey(today) : formatDateKey(monthRef);
}

function startupResources(settings: SettingsScreenData): DesktopCacheResource[] {
  const path = startupPath(settings);
  const resources = [resourceForSettings(settings)];

  if (path === '/overview') {
    const range = storedRangeSelection('overview', settings);
    resources.push(resourceForOverview(range.range, range.customRange));
  } else if (path === '/analytics') {
    resources.push(resourceForAnalytics(startupAnalyticsFilters(settings)));
  } else if (path === '/sessions') {
    const range = storedRangeSelection('sessions', settings);
    resources.push(resourceForSessions(range.range, range.customRange));
  } else if (path === '/calendar') {
    const startupMonth = startupMonthRef(settings);
    resources.push(resourceForCalendarMonth(startupMonth.getFullYear(), startupMonth.getMonth()));
    resources.push(resourceForCalendarDay(startupCalendarDay(startupMonth)));
  }

  return resources;
}

function knownWarmupResources(settings: SettingsScreenData): DesktopCacheResource[] {
  const monthRef = currentMonthRef();
  const resources: DesktopCacheResource[] = [
    resourceForSettings(settings),
    resourceForCalendarMonth(monthRef.year, monthRef.month),
    resourceForCalendarDay(monthRef.today),
  ];

  if (settings.viewModel.appBehavior.reopenLastViewedContext) {
    const savedMonth = readCalendarMonthPreference();
    if (savedMonth) {
      resources.push(resourceForCalendarMonth(savedMonth.getFullYear(), savedMonth.getMonth()));
    }
  }

  for (const range of presetOverviewRanges) {
    resources.push(resourceForOverview(range, null));
    resources.push(resourceForSessions(range, null));
    resources.push(resourceForAnalytics({
      range,
      customRange: null,
      project: 'all',
      language: 'all',
      machine: 'all',
    }));
  }

  return resources;
}

async function warmDesktopResources(
  resources: DesktopCacheResource[],
  { force = false, concurrency = desktopWarmupConcurrency }: { force?: boolean; concurrency?: number } = {},
): Promise<void> {
  const uniqueResources = [...new Map(resources.map((resource) => [resource.key, resource])).values()];
  let nextIndex = 0;
  const workerCount = Math.min(concurrency, uniqueResources.length);

  await Promise.allSettled(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < uniqueResources.length) {
        const resource = uniqueResources[nextIndex];
        nextIndex += 1;

        if (!force && desktopDataCache.has(resource.key)) {
          continue;
        }

        try {
          const value = await resource.load();
          setCachedDesktopResource(resource.key, value);
        } catch {
          // Warmup should never prevent the current page from opening.
        }
      }
    }),
  );
}

async function bootstrapDesktopCache(): Promise<void> {
  const settings = await loadSettingsScreenData({ quiet: true }).catch(() => null);
  if (!settings) {
    await warmDesktopResources([resourceForSettings(null)], { concurrency: 1 });
    return;
  }

  setCachedDesktopResource(desktopResourceKeys.settings(), settings);
  await warmDesktopResources(startupResources(settings));
  void warmDesktopResources(knownWarmupResources(settings));
}

export function DesktopDataProvider({ children }: PropsWithChildren) {
  const [bootstrapped, setBootstrapped] = useState(false);
  const [backgroundSyncCount, setBackgroundSyncCount] = useState(0);
  const refreshersRef = useRef(new Map<string, Set<(signal: DesktopRefreshSignal) => Promise<void> | void>>());
  const lastExtensionProbeAtRef = useRef(0);
  const extensionProbeInFlightRef = useRef(false);
  const latestEventRevisionRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const queuedRefreshSignalRef = useRef<DesktopRefreshSignal | null>(null);
  const lastFocusRefreshAtRef = useRef(0);

  const registerRefresher = useCallback<DesktopDataContextValue['registerRefresher']>((key, refresher) => {
    const existing = refreshersRef.current.get(key) ?? new Set();
    existing.add(refresher);
    refreshersRef.current.set(key, existing);

    return () => {
      const group = refreshersRef.current.get(key);
      if (!group) {
        return;
      }
      group.delete(refresher);
      if (group.size === 0) {
        refreshersRef.current.delete(key);
      }
    };
  }, []);

  const beginBackgroundSync = () => {
    let active = true;
    setBackgroundSyncCount((current) => current + 1);

    return () => {
      if (!active) {
        return;
      }
      active = false;
      setBackgroundSyncCount((current) => Math.max(0, current - 1));
    };
  };

  const refreshAll = async (signal: DesktopRefreshSignal) => {
    const handlers = Array.from(refreshersRef.current.entries()).flatMap(([key, group]) => {
      if (signal.reason === 'event' && !matchesEventKindToResourceKey(key, signal.kind)) {
        return [];
      }
      return Array.from(group);
    });
    if (handlers.length === 0) {
      return;
    }

    await Promise.allSettled(
      handlers.map(async (handler) => {
        await handler(signal);
      }),
    );
  };

  const queueRefresh = (reason: DesktopRefreshReason, revision?: number, kind?: string) => {
    const normalizedRevision = normalizeRevision(revision);
    if (normalizedRevision !== null) {
      latestEventRevisionRef.current = Math.max(latestEventRevisionRef.current, normalizedRevision);
    }
    const signal: DesktopRefreshSignal = {
      reason,
      revision: latestEventRevisionRef.current,
      kind: reason === 'event' ? kind?.trim().toLowerCase() : undefined,
    };

    if (refreshInFlightRef.current) {
      queuedRefreshSignalRef.current = mergeRefreshSignal(queuedRefreshSignalRef.current, signal);
      return;
    }

    refreshInFlightRef.current = true;
    void (async () => {
      let nextSignal: DesktopRefreshSignal | null = signal;
      while (nextSignal) {
        const activeSignal = nextSignal;
        const endBackgroundSync = isBackgroundSyncReason(activeSignal.reason)
          ? beginBackgroundSync()
          : undefined;
        try {
          await refreshAll(activeSignal);
        } finally {
          endBackgroundSync?.();
        }
        nextSignal = queuedRefreshSignalRef.current;
        queuedRefreshSignalRef.current = null;
      }
    })().finally(() => {
      refreshInFlightRef.current = false;
      if (queuedRefreshSignalRef.current) {
        const queued = queuedRefreshSignalRef.current;
        queuedRefreshSignalRef.current = null;
        queueRefresh(queued.reason, queued.revision, queued.kind);
      }
    });
  };

  useEffect(() => {
    let active = true;

    void bootstrapDesktopCache().finally(() => {
      if (active) {
        setBootstrapped(true);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!bootstrapped) {
      return;
    }

    let active = true;
    const runPollTick = async () => {
      const now = Date.now();
      if (!extensionProbeInFlightRef.current && now-lastExtensionProbeAtRef.current >= EXTENSION_PROBE_INTERVAL_MS) {
        extensionProbeInFlightRef.current = true;
        try {
          await probeVSCodeExtensionStatus();
        } finally {
          lastExtensionProbeAtRef.current = Date.now();
          extensionProbeInFlightRef.current = false;
        }
      }
      queueRefresh('poll');
    };

    void runPollTick();
    const intervalId = window.setInterval(() => {
      if (!active) {
        return;
      }
      void runPollTick();
    }, DATA_REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [bootstrapped]);

  useEffect(() => {
    // Wails runtime is unavailable in standalone dev mode (pnpm run dev).
    if (!(window as unknown as { runtime?: unknown }).runtime) {
      return;
    }

    const unsubscribe = EventsOn(dataChangedEventName, (...eventArgs: unknown[]) => {
      queueRefresh(
        'event',
        extractEventRevision(eventArgs) ?? undefined,
        extractEventKind(eventArgs),
      );
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!bootstrapped) {
      return;
    }

    const runFocusRefresh = () => {
      const now = Date.now();
      if (now - lastFocusRefreshAtRef.current < FOCUS_REFRESH_THROTTLE_MS) {
        return;
      }
      lastFocusRefreshAtRef.current = now;

      if (!extensionProbeInFlightRef.current) {
        extensionProbeInFlightRef.current = true;
        void probeVSCodeExtensionStatus()
          .catch(() => undefined)
          .finally(() => {
            lastExtensionProbeAtRef.current = Date.now();
            extensionProbeInFlightRef.current = false;
          });
      }

      queueRefresh('manual');
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runFocusRefresh();
      }
    };

    window.addEventListener('focus', runFocusRefresh);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('focus', runFocusRefresh);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [bootstrapped]);

  const value = useMemo<DesktopDataContextValue>(() => ({
    bootstrapped,
    backgroundSyncing: backgroundSyncCount > 0,
    registerRefresher,
  }), [backgroundSyncCount, bootstrapped, registerRefresher]);

  return (
    <DesktopDataContext.Provider value={value}>
      {children}
    </DesktopDataContext.Provider>
  );
}

export function useDesktopData() {
  const context = useContext(DesktopDataContext);
  if (!context) {
    throw new Error('useDesktopData must be used within DesktopDataProvider');
  }
  return context;
}
