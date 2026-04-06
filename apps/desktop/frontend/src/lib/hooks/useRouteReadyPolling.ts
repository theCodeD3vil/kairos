import { DependencyList, useEffect, useRef, useState } from 'react';
import { useAppPolling } from '@/app/AppPollingContext';
import { useRouteTransitionReady } from '@/app/RouteTransitionContext';

type UseRouteReadyPollingOptions<T> = {
  dependencies: DependencyList;
  deferInitialLoad?: boolean;
  enabled?: boolean;
  load: () => Promise<T>;
  onError: (error: unknown) => void;
  onSuccess: (value: T) => void;
};

export function useRouteReadyPolling<T>({
  dependencies,
  deferInitialLoad = false,
  enabled = true,
  load,
  onError,
  onSuccess,
}: UseRouteReadyPollingOptions<T>) {
  const routeReady = useRouteTransitionReady();
  const { tick } = useAppPolling();
  const loadRef = useRef(load);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const inFlightRef = useRef(false);
  const hasCompletedLoadRef = useRef(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const previousDependenciesRef = useRef<DependencyList>(dependencies);

  loadRef.current = load;
  onSuccessRef.current = onSuccess;
  onErrorRef.current = onError;

  useEffect(() => {
    return () => {
      inFlightRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !routeReady) {
      return;
    }

    let active = true;
    const dependenciesChanged = previousDependenciesRef.current.some(
      (value, index) => !Object.is(value, dependencies[index]),
    ) || previousDependenciesRef.current.length !== dependencies.length;

    const runLoad = async () => {
      if (inFlightRef.current) {
        return;
      }

      inFlightRef.current = true;

      try {
        const value = await loadRef.current();
        if (active) {
          hasCompletedLoadRef.current = true;
          setHasLoadedOnce(true);
          onSuccessRef.current(value);
        }
      } catch (error) {
        if (active) {
          onErrorRef.current(error);
        }
      } finally {
        inFlightRef.current = false;
      }
    };

    const shouldRunImmediately =
      !deferInitialLoad ||
      (hasCompletedLoadRef.current && dependenciesChanged);

    if (shouldRunImmediately) {
      void runLoad();
    }
    if (tick > 0) {
      void runLoad();
    }

    previousDependenciesRef.current = dependencies;

    return () => {
      active = false;
    };
  }, [enabled, routeReady, tick, ...dependencies]);

  return {
    hasLoadedOnce,
    isWaitingForFirstPoll: enabled && routeReady && deferInitialLoad && !hasLoadedOnce,
  };
}
