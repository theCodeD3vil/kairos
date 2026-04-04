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
import Notification from '@/components/ruixen/notification';
import {
  createToastRecord,
  createToastState,
  DEFAULT_DURATIONS,
  DEFAULT_MAX_VISIBLE,
  dismissToast,
  enqueueToast,
  type ToastPayload,
  type ToastState,
  type ToastType,
} from '@/lib/toast-controller';
import {
  registerToastApi,
  type ToastApi,
  type ToastOptions,
} from '@/lib/toast';

type ToastProviderProps = PropsWithChildren<{
  maxVisible?: number;
  defaultDurations?: Partial<Record<ToastType, number>>;
}>;

type ToastContextValue = ToastApi;

const ToastContext = createContext<ToastContextValue | null>(null);

const buildPayload = (
  type: ToastType,
  title: string,
  body?: string,
  options?: ToastOptions,
): ToastPayload => ({
  type,
  title,
  body: body ?? '',
  durationMs: options?.durationMs,
});

export function ToastProvider({
  children,
  maxVisible = DEFAULT_MAX_VISIBLE,
  defaultDurations,
}: ToastProviderProps) {
  const [state, setState] = useState<ToastState>(() => createToastState());
  const timersRef = useRef<Map<string, number>>(new Map());

  const resolveDuration = useCallback(
    (type: ToastType, explicit?: number) =>
      explicit ?? defaultDurations?.[type] ?? DEFAULT_DURATIONS[type],
    [defaultDurations],
  );

  const dismiss = useCallback(
    (id: string) => {
      const timer = timersRef.current.get(id);
      if (timer) {
        window.clearTimeout(timer);
        timersRef.current.delete(id);
      }
      setState((current) => dismissToast(current, id, maxVisible));
    },
    [maxVisible],
  );

  const notify = useCallback(
    (payload: ToastPayload) => {
      const type = payload.type ?? 'default';
      const next = createToastRecord({
        ...payload,
        type,
        durationMs: resolveDuration(type, payload.durationMs),
      });
      setState((current) => enqueueToast(current, next, maxVisible));
      return next.id;
    },
    [maxVisible, resolveDuration],
  );

  const api = useMemo<ToastApi>(
    () => ({
      notify,
      success: (title, body, options) =>
        notify(buildPayload('success', title, body, options)),
      error: (title, body, options) =>
        notify(buildPayload('error', title, body, options)),
      info: (title, body, options) =>
        notify(buildPayload('default', title, body, options)),
      dismiss,
    }),
    [dismiss, notify],
  );

  useEffect(() => {
    registerToastApi(api);
    return () => {
      registerToastApi(null);
    };
  }, [api]);

  useEffect(() => {
    const visibleIds = new Set(state.visible.map((item) => item.id));

    for (const toast of state.visible) {
      if (timersRef.current.has(toast.id)) continue;
      const timeoutId = window.setTimeout(() => {
        dismiss(toast.id);
      }, toast.durationMs);
      timersRef.current.set(toast.id, timeoutId);
    }

    for (const [id, timeoutId] of timersRef.current.entries()) {
      if (visibleIds.has(id)) continue;
      window.clearTimeout(timeoutId);
      timersRef.current.delete(id);
    }
  }, [dismiss, state.visible]);

  useEffect(
    () => () => {
      for (const timeoutId of timersRef.current.values()) {
        window.clearTimeout(timeoutId);
      }
      timersRef.current.clear();
    },
    [],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-7 top-24 z-[70]">
        <div className="pointer-events-auto">
          <Notification items={state.visible} onDismiss={dismiss} />
        </div>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}

