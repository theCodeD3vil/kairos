/**
 * Lightweight, localStorage-backed notification store.
 *
 * Stores persistent in-app notifications (e.g. update alerts) that survive
 * page reloads. Mutations dispatch a custom DOM event so React consumers
 * can subscribe via `useSyncExternalStore`.
 */

const STORAGE_KEY = 'kairos:notifications';
const CHANGE_EVENT = 'kairos:notifications-changed';

/* ── Types ── */

export type NotificationCategory = 'Updates';

export type NotificationAction = {
  type: 'navigate';
  target: string;
};

export type AppNotification = {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  createdAt: number;
  read: boolean;
  action?: NotificationAction;
};

export type AddNotificationInput = Omit<AppNotification, 'id' | 'createdAt' | 'read'>;

/* ── Internal state ── */

let cache: AppNotification[] | null = null;

function load(): AppNotification[] {
  if (cache !== null) {
    return cache;
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppNotification[];
      if (Array.isArray(parsed)) {
        cache = parsed;
        return cache;
      }
    }
  } catch {
    // Corrupt data — start fresh.
  }

  cache = [];
  return cache;
}

function persist(next: AppNotification[]): void {
  cache = next;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full — notifications are best-effort.
  }

  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/* ── Public API ── */

export function getAll(): AppNotification[] {
  return load();
}

export function getUnreadCount(): number {
  return load().filter((n) => !n.read).length;
}

export function addNotification(input: AddNotificationInput): string {
  const items = load();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const notification: AppNotification = {
    ...input,
    id,
    createdAt: Date.now(),
    read: false,
  };

  persist([notification, ...items]);
  return id;
}

/**
 * Prevents duplicate notifications for the same logical event.
 * If a notification with the same `dedupKey` (matched by title) already
 * exists, the call is a no-op and returns the existing ID.
 */
export function addNotificationIfNew(input: AddNotificationInput): string {
  const items = load();
  const existing = items.find((n) => n.title === input.title && n.body === input.body);
  if (existing) {
    return existing.id;
  }
  return addNotification(input);
}

export function markRead(id: string): void {
  const items = load();
  const idx = items.findIndex((n) => n.id === id);
  if (idx === -1 || items[idx].read) {
    return;
  }

  const next = [...items];
  next[idx] = { ...next[idx], read: true };
  persist(next);
}

export function markAllRead(): void {
  const items = load();
  if (items.every((n) => n.read)) {
    return;
  }

  persist(items.map((n) => ({ ...n, read: true })));
}

export function dismiss(id: string): void {
  const items = load();
  const next = items.filter((n) => n.id !== id);
  if (next.length === items.length) {
    return;
  }
  persist(next);
}

export function clearAll(): void {
  if (load().length === 0) {
    return;
  }
  persist([]);
}

/* ── Subscription helper for useSyncExternalStore ── */

export function subscribe(callback: () => void): () => void {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

export function getSnapshot(): AppNotification[] {
  return load();
}
