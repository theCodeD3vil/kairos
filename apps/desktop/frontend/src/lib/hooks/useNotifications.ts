import { useSyncExternalStore, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAll,
  getSnapshot,
  getUnreadCount,
  subscribe,
  markRead as storeMarkRead,
  markAllRead as storeMarkAllRead,
  dismiss as storeDismiss,
  clearAll as storeClearAll,
  type AppNotification,
} from '@/lib/notification-store';

export function useNotifications() {
  const notifications = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const navigate = useNavigate();

  const unreadCount = useSyncExternalStore(
    subscribe,
    getUnreadCount,
    getUnreadCount,
  );

  const markRead = useCallback((id: string) => {
    storeMarkRead(id);
  }, []);

  const markAllRead = useCallback(() => {
    storeMarkAllRead();
  }, []);

  const dismiss = useCallback((id: string) => {
    storeDismiss(id);
  }, []);

  const clearAll = useCallback(() => {
    storeClearAll();
  }, []);

  const handleSelect = useCallback(
    (notification: AppNotification) => {
      storeMarkRead(notification.id);
      if (notification.action?.type === 'navigate') {
        navigate(notification.action.target);
      }
    },
    [navigate],
  );

  return {
    notifications,
    unreadCount,
    markRead,
    markAllRead,
    dismiss,
    clearAll,
    handleSelect,
  };
}
