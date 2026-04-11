import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { EventsOn } from '../../wailsjs/runtime/runtime';
import type { DateRange } from '@/components/ruixen/range-calendar';
import { normalizeOverviewRange, type OverviewRange } from '@/components/overview/types';
import type { AnalyticsFilters } from '@/data/mockAnalytics';
import {
  loadAnalyticsSnapshot,
  loadCalendarDay,
  loadCalendarMonth,
  loadOverviewSnapshot,
  loadSessionsScreenData,
} from '@/lib/backend/page-data';
import { loadSettingsScreenData, probeVSCodeExtensionStatus } from '@/lib/backend/settings';

export const DATA_REFRESH_INTERVAL_MS = 60_000;
const EXTENSION_PROBE_INTERVAL_MS = DATA_REFRESH_INTERVAL_MS;

export type DesktopRefreshReason = 'poll' | 'event' | 'manual' | 'query';
export type DesktopRefreshSignal = {
  reason: DesktopRefreshReason;
  revision: number;
};

type DesktopDataContextValue = {
  bootstrapped: boolean;
  registerRefresher: (key: string, refresher: (signal: DesktopRefreshSignal) => Promise<void> | void) => () => void;
};

const DesktopDataContext = createContext<DesktopDataContextValue | null>(null);
const desktopDataCache = new Map<string, unknown>();
const dataChangedEventName = 'kairos:data-changed';

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

async function bootstrapDesktopCache(): Promise<void> {
  const monthRef = currentMonthRef();
  const settings = await loadSettingsScreenData({ quiet: true }).catch(() => null);
  const defaultRange = normalizeOverviewRange(settings?.viewModel.general.defaultDateRange);
  const defaultAnalyticsFilters: AnalyticsFilters = {
    range: defaultRange,
    customRange: null,
    project: 'all',
    language: 'all',
    machine: 'all',
  };

  const resources = [
    {
      key: desktopResourceKeys.overview(defaultRange, null),
      load: () => loadOverviewSnapshot(defaultRange, null, { quiet: true }),
    },
    {
      key: desktopResourceKeys.analytics(defaultAnalyticsFilters),
      load: () => loadAnalyticsSnapshot(defaultAnalyticsFilters, { quiet: true }),
    },
    {
      key: desktopResourceKeys.sessions(defaultRange, null),
      load: () => loadSessionsScreenData(defaultRange, null, { quiet: true }),
    },
    {
      key: desktopResourceKeys.calendarMonth(monthRef.year, monthRef.month),
      load: () => loadCalendarMonth(monthRef.year, monthRef.month, { quiet: true }),
    },
    {
      key: desktopResourceKeys.calendarDay(monthRef.today),
      load: () => loadCalendarDay(monthRef.today, { quiet: true }),
    },
    {
      key: desktopResourceKeys.settings(),
      load: () => settings ?? loadSettingsScreenData({ quiet: true }),
    },
  ];

  await Promise.allSettled(
    resources.map(async (resource) => {
      const value = await resource.load();
      setCachedDesktopResource(resource.key, value);
    }),
  );
}

export function DesktopDataProvider({ children }: PropsWithChildren) {
  const [bootstrapped, setBootstrapped] = useState(false);
  const refreshersRef = useRef(new Map<string, Set<(signal: DesktopRefreshSignal) => Promise<void> | void>>());
  const lastExtensionProbeAtRef = useRef(0);
  const extensionProbeInFlightRef = useRef(false);
  const latestEventRevisionRef = useRef(0);
  const refreshInFlightRef = useRef(false);
  const queuedRefreshSignalRef = useRef<DesktopRefreshSignal | null>(null);

  const refreshAll = async (signal: DesktopRefreshSignal) => {
    const handlers = Array.from(refreshersRef.current.values()).flatMap((group) => Array.from(group));
    if (handlers.length === 0) {
      return;
    }

    await Promise.allSettled(
      handlers.map(async (handler) => {
        await handler(signal);
      }),
    );
  };

  const queueRefresh = (reason: DesktopRefreshReason, revision?: number) => {
    const normalizedRevision = normalizeRevision(revision);
    if (normalizedRevision !== null) {
      latestEventRevisionRef.current = Math.max(latestEventRevisionRef.current, normalizedRevision);
    }
    const signal: DesktopRefreshSignal = {
      reason,
      revision: latestEventRevisionRef.current,
    };

    if (refreshInFlightRef.current) {
      queuedRefreshSignalRef.current = mergeRefreshSignal(queuedRefreshSignalRef.current, signal);
      return;
    }

    refreshInFlightRef.current = true;
    void (async () => {
      let nextSignal: DesktopRefreshSignal | null = signal;
      while (nextSignal) {
        await refreshAll(nextSignal);
        nextSignal = queuedRefreshSignalRef.current;
        queuedRefreshSignalRef.current = null;
      }
    })().finally(() => {
      refreshInFlightRef.current = false;
      if (queuedRefreshSignalRef.current) {
        const queued = queuedRefreshSignalRef.current;
        queuedRefreshSignalRef.current = null;
        queueRefresh(queued.reason, queued.revision);
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
      queueRefresh('event', extractEventRevision(eventArgs) ?? undefined);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const value = useMemo<DesktopDataContextValue>(() => ({
    bootstrapped,
    registerRefresher(key, refresher) {
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
    },
  }), [bootstrapped]);

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
