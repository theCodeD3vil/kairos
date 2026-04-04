export type ToastType = 'default' | 'success' | 'error';

export type ToastPayload = {
  title: string;
  body: string;
  type?: ToastType;
  durationMs?: number;
};

export type ToastRecord = {
  id: string;
  title: string;
  body: string;
  type: ToastType;
  time: string;
  durationMs: number;
  createdAt: number;
};

export type ToastState = {
  visible: ToastRecord[];
  pending: ToastRecord[];
};

export const DEFAULT_MAX_VISIBLE = 4;

export const DEFAULT_DURATIONS: Record<ToastType, number> = {
  default: 4000,
  success: 4000,
  error: 6000,
};

export function createToastState(): ToastState {
  return { visible: [], pending: [] };
}

export function createToastRecord(
  payload: ToastPayload,
  now: number = Date.now(),
): ToastRecord {
  const type = payload.type ?? 'default';
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 9)}`,
    title: payload.title,
    body: payload.body,
    type,
    time: 'now',
    durationMs: payload.durationMs ?? DEFAULT_DURATIONS[type],
    createdAt: now,
  };
}

function promotePending(state: ToastState, maxVisible: number): ToastState {
  if (state.visible.length >= maxVisible || state.pending.length === 0) {
    return state;
  }

  const slots = maxVisible - state.visible.length;
  const promoted = state.pending.slice(0, slots);
  return {
    visible: [...state.visible, ...promoted],
    pending: state.pending.slice(promoted.length),
  };
}

export function enqueueToast(
  state: ToastState,
  toast: ToastRecord,
  maxVisible: number = DEFAULT_MAX_VISIBLE,
): ToastState {
  if (state.visible.length < maxVisible) {
    return {
      ...state,
      visible: [...state.visible, toast],
    };
  }

  return {
    ...state,
    pending: [...state.pending, toast],
  };
}

export function dismissToast(
  state: ToastState,
  id: string,
  maxVisible: number = DEFAULT_MAX_VISIBLE,
): ToastState {
  const next: ToastState = {
    visible: state.visible.filter((item) => item.id !== id),
    pending: state.pending.filter((item) => item.id !== id),
  };

  return promotePending(next, maxVisible);
}
