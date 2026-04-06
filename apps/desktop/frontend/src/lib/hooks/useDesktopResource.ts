import { useEffect, useRef, useState } from 'react';
import {
  getCachedDesktopResource,
  setCachedDesktopResource,
  useDesktopData,
  type DesktopRefreshReason,
} from '@/app/DesktopDataContext';

type UseDesktopResourceOptions<T> = {
  cacheKey: string;
  emptyValue: T;
  errorMessage: string;
  enabled?: boolean;
  load: (options?: { quiet?: boolean }) => Promise<T>;
};

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

  const runLoad = async (reason: DesktopRefreshReason) => {
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
        if (reason === 'poll' || reason === 'event') {
          setRefreshPulseKey((current) => current + 1);
        }
      }
    } catch {
      if (keyRef.current === activeKey) {
        setLoadError(errorMessageRef.current);
      }
      if (reason === 'manual') {
        throw new Error(errorMessageRef.current);
      }
    } finally {
      inFlightRef.current = false;
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
