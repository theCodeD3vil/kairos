import {
  createContext,
  type PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { cn } from '@/lib/utils';
import { registerSyncStatusApi, type SyncIndicatorState, type SyncStatusApi } from '@/lib/sync-status';

type SyncStatusContextValue = SyncStatusApi;

type SyncSnapshot = {
  state: SyncIndicatorState;
  message: string;
  visible: boolean;
};

const SyncStatusContext = createContext<SyncStatusContextValue | null>(null);
const SUCCESS_HIDE_DELAY_MS = 1800;
const WARNING_HIDE_DELAY_MS = 2600;
const ERROR_HIDE_DELAY_MS = 3200;

function nextToken() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `sync-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toneClasses(state: SyncIndicatorState) {
  switch (state) {
    case 'success':
      return {
        container: 'border-emerald-500/25 bg-emerald-500/12 text-emerald-950',
        dot: 'bg-emerald-400',
      };
    case 'warning':
      return {
        container: 'border-amber-500/30 bg-amber-500/15 text-amber-950',
        dot: 'bg-amber-400',
      };
    case 'error':
      return {
        container: 'border-rose-500/30 bg-rose-500/15 text-rose-950',
        dot: 'bg-rose-400',
      };
    default:
      return {
        container: 'border-sky-500/25 bg-sky-500/14 text-sky-950',
        dot: 'bg-sky-400',
      };
  }
}

function defaultMessage(state: SyncIndicatorState) {
  switch (state) {
    case 'success':
      return 'Synced';
    case 'warning':
      return 'Sync warning';
    case 'error':
      return 'Sync failed';
    default:
      return 'Syncing';
  }
}

export function SyncStatusProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<SyncSnapshot>({
    state: 'idle',
    message: '',
    visible: false,
  });
  const pendingTokensRef = useRef<Set<string>>(new Set());
  const hideTimerRef = useRef<number | null>(null);

  const clearHideTimer = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };

  const scheduleHide = (delayMs: number) => {
    clearHideTimer();
    hideTimerRef.current = window.setTimeout(() => {
      setSnapshot((current) => ({
        ...current,
        state: 'idle',
        message: '',
        visible: false,
      }));
      hideTimerRef.current = null;
    }, delayMs);
  };

  const api = useMemo<SyncStatusApi>(() => ({
    begin(message) {
      const token = nextToken();
      pendingTokensRef.current.add(token);
      clearHideTimer();
      setSnapshot({
        state: 'in-progress',
        message: message || defaultMessage('in-progress'),
        visible: true,
      });
      return token;
    },
    succeed(token, message) {
      pendingTokensRef.current.delete(token);
      if (pendingTokensRef.current.size > 0) {
        setSnapshot({
          state: 'in-progress',
          message: defaultMessage('in-progress'),
          visible: true,
        });
        return;
      }
      setSnapshot({
        state: 'success',
        message: message || defaultMessage('success'),
        visible: true,
      });
      scheduleHide(SUCCESS_HIDE_DELAY_MS);
    },
    warn(token, message) {
      pendingTokensRef.current.delete(token);
      setSnapshot({
        state: 'warning',
        message: message || defaultMessage('warning'),
        visible: true,
      });
      scheduleHide(WARNING_HIDE_DELAY_MS);
    },
    fail(token, message) {
      pendingTokensRef.current.delete(token);
      setSnapshot({
        state: 'error',
        message: message || defaultMessage('error'),
        visible: true,
      });
      scheduleHide(ERROR_HIDE_DELAY_MS);
    },
    clear() {
      pendingTokensRef.current.clear();
      clearHideTimer();
      setSnapshot({
        state: 'idle',
        message: '',
        visible: false,
      });
    },
  }), []);

  useEffect(() => {
    registerSyncStatusApi(api);
    return () => {
      registerSyncStatusApi(null);
      clearHideTimer();
    };
  }, [api]);

  const tone = toneClasses(snapshot.state);

  return (
    <SyncStatusContext.Provider value={api}>
      {children}
      {snapshot.visible ? (
        <div className="pointer-events-none fixed right-5 bottom-5 z-[65]">
          <div
            className={cn(
              'flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium shadow-[var(--shadow-glass)] backdrop-blur-md',
              tone.container,
            )}
          >
            <span className={cn('h-2 w-2 rounded-full', tone.dot, snapshot.state === 'in-progress' ? 'animate-pulse' : '')} />
            <span className="whitespace-nowrap">{snapshot.message}</span>
          </div>
        </div>
      ) : null}
    </SyncStatusContext.Provider>
  );
}

export function useSyncStatus(): SyncStatusContextValue {
  const context = useContext(SyncStatusContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within SyncStatusProvider');
  }
  return context;
}
