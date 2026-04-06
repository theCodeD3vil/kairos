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
import type { OverviewRange } from '@/components/overview/types';
import type { AnalyticsFilters } from '@/data/mockAnalytics';
import {
  loadAnalyticsSnapshot,
  loadCalendarDay,
  loadCalendarMonth,
  loadOverviewSnapshot,
  loadSessionsScreenData,
} from '@/lib/backend/page-data';
import { loadSettingsScreenData } from '@/lib/backend/settings';

export const DATA_REFRESH_INTERVAL_MS = 10_000;

export type DesktopRefreshReason = 'poll' | 'event' | 'manual' | 'query';

type DesktopDataContextValue = {
  bootstrapped: boolean;
  registerRefresher: (key: string, refresher: (reason: DesktopRefreshReason) => Promise<void> | void) => () => void;
};

const DesktopDataContext = createContext<DesktopDataContextValue | null>(null);
const desktopDataCache = new Map<string, unknown>();
const dataChangedEventName = 'kairos:data-changed';

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
  const defaultAnalyticsFilters: AnalyticsFilters = {
    range: 'week',
    customRange: null,
    project: 'all',
    language: 'all',
    machine: 'all',
  };

  const resources = [
    {
      key: desktopResourceKeys.overview('week', null),
      load: () => loadOverviewSnapshot('week', null, { quiet: true }),
    },
    {
      key: desktopResourceKeys.analytics(defaultAnalyticsFilters),
      load: () => loadAnalyticsSnapshot(defaultAnalyticsFilters, { quiet: true }),
    },
    {
      key: desktopResourceKeys.sessions('week', null),
      load: () => loadSessionsScreenData('week', null, { quiet: true }),
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
      load: () => loadSettingsScreenData({ quiet: true }),
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
  const refreshersRef = useRef(new Map<string, Set<(reason: DesktopRefreshReason) => Promise<void> | void>>());

  const refreshAll = async (reason: DesktopRefreshReason) => {
    const handlers = Array.from(refreshersRef.current.values()).flatMap((group) => Array.from(group));
    if (handlers.length === 0) {
      return;
    }

    await Promise.allSettled(
      handlers.map(async (handler) => {
        await handler(reason);
      }),
    );
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

    const intervalId = window.setInterval(() => {
      void refreshAll('poll');
    }, DATA_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [bootstrapped]);

  useEffect(() => {
    const unsubscribe = EventsOn(dataChangedEventName, () => {
      void refreshAll('event');
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
