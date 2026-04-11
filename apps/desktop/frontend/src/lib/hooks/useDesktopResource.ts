import { useEffect, useRef, useState } from 'react';
import {
  getCachedDesktopResource,
  setCachedDesktopResource,
  useDesktopData,
  type DesktopRefreshReason,
  type DesktopRefreshSignal,
} from '@/app/DesktopDataContext';

type UseDesktopResourceOptions<T> = {
  cacheKey: string;
  emptyValue: T;
  errorMessage: string;
  enabled?: boolean;
  load: (options?: { quiet?: boolean }) => Promise<T>;
};

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

function toRefreshSignal(
  input: DesktopRefreshReason | DesktopRefreshSignal | undefined,
  fallbackRevision: number,
): DesktopRefreshSignal {
  if (!input) {
    return {
      reason: 'manual',
      revision: fallbackRevision,
    };
  }
  if (typeof input === 'string') {
    return {
      reason: input,
      revision: fallbackRevision,
    };
  }
  return input;
}

export function useDesktopResource<T>({
  cacheKey,
  emptyValue,
  errorMessage,
  enabled = true,
  load,
}: UseDesktopResourceOptions<T>) {
  const { bootstrapped, registerRefresher } = useDesktopData();
  const [data, setData] = useState<T>(() => getCachedDesktopResource<T>(cacheKey) ?? emptyValue);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [refreshPulseKey, setRefreshPulseKey] = useState(0);
  const [hasResolvedOnce, setHasResolvedOnce] = useState(() => getCachedDesktopResource<T>(cacheKey) !== undefined);
  const inFlightRef = useRef(false);
  const queuedRefreshSignalRef = useRef<DesktopRefreshSignal | null>(null);
  const latestSeenRevisionRef = useRef(0);
  const keyRef = useRef(cacheKey);
  const loadRef = useRef(load);
  const errorMessageRef = useRef(errorMessage);

  keyRef.current = cacheKey;
  loadRef.current = load;
  errorMessageRef.current = errorMessage;

  useEffect(() => {
    setLoadError(null);
    const cached = getCachedDesktopResource<T>(cacheKey);
    if (cached !== undefined) {
      setData(cached);
      setLoadError(null);
      setHasResolvedOnce(true);
    }
  }, [cacheKey]);

  const runLoad = async (input?: DesktopRefreshReason | DesktopRefreshSignal) => {
    const signal = toRefreshSignal(input, latestSeenRevisionRef.current);
    latestSeenRevisionRef.current = Math.max(latestSeenRevisionRef.current, signal.revision);

    if (inFlightRef.current) {
      queuedRefreshSignalRef.current = mergeRefreshSignal(queuedRefreshSignalRef.current, signal);
      return;
    }

    inFlightRef.current = true;
    let nextSignal: DesktopRefreshSignal | null = signal;

    try {
      while (nextSignal) {
        const activeSignal = nextSignal;
        const activeKey = keyRef.current;
        try {
          const next = await loadRef.current({ quiet: true });
          const shouldApply = activeSignal.revision >= latestSeenRevisionRef.current;
          if (!shouldApply) {
            nextSignal = queuedRefreshSignalRef.current;
            queuedRefreshSignalRef.current = null;
            continue;
          }
          setCachedDesktopResource(activeKey, next);
          if (keyRef.current === activeKey) {
            setData(next);
            setLoadError(null);
            setHasResolvedOnce(true);
            if (activeSignal.reason === 'poll' || activeSignal.reason === 'event') {
              setRefreshPulseKey((current) => current + 1);
            }
          }
        } catch {
          if (keyRef.current === activeKey) {
            setLoadError(errorMessageRef.current);
          }
          if (activeSignal.reason === 'manual') {
            throw new Error(errorMessageRef.current);
          }
        }

        nextSignal = queuedRefreshSignalRef.current;
        queuedRefreshSignalRef.current = null;
      }
    } finally {
      inFlightRef.current = false;
      if (queuedRefreshSignalRef.current) {
        const queued = queuedRefreshSignalRef.current;
        queuedRefreshSignalRef.current = null;
        void runLoad(queued);
      }
    }
  };

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const unregister = registerRefresher(cacheKey, runLoad);
    return unregister;
  }, [cacheKey, enabled, registerRefresher]);

  useEffect(() => {
    if (!enabled || !bootstrapped) {
      return;
    }

    const cached = getCachedDesktopResource<T>(cacheKey);
    if (cached !== undefined) {
      setData(cached);
      setLoadError(null);
      setHasResolvedOnce(true);
      return;
    }

    void (async () => {
      if (inFlightRef.current) {
        return;
      }
      inFlightRef.current = true;
      const activeKey = keyRef.current;

      try {
        const next = await loadRef.current({ quiet: true });
        setCachedDesktopResource(activeKey, next);
        if (keyRef.current === activeKey) {
          setData(next);
          setLoadError(null);
          setHasResolvedOnce(true);
        }
      } catch {
        if (keyRef.current === activeKey) {
          setLoadError(errorMessageRef.current);
        }
      } finally {
        inFlightRef.current = false;
      }
    })();
  }, [bootstrapped, cacheKey, enabled]);

  return {
    data,
    hasResolvedOnce,
    isInitialLoading: enabled && !hasResolvedOnce,
    loadError,
    refreshPulseKey,
    refresh: runLoad,
  };
}
