import { useEffect, useRef } from 'react';
import {
  CheckNotificationAuthorization,
  InitializeNotifications,
  IsNotificationAvailable,
  RequestNotificationAuthorization,
  SendNotification,
} from '../../wailsjs/runtime/runtime';
import { useToast } from '@/components/toast/ToastProvider';
import { checkDesktopUpdate } from '@/lib/backend/settings';
import { addNotificationIfNew } from '@/lib/notification-store';

const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
const UPDATE_NOTICE_STORAGE_KEY = 'kairos:update-notice-token';

function buildUpdateToken(currentVersion: string, latestVersion: string): string {
  return `${currentVersion.trim()}->${latestVersion.trim()}`;
}

export function UpdateNotifier() {
  const { info } = useToast();
  const checkingRef = useRef(false);

  useEffect(() => {
    let active = true;

    const runCheck = async () => {
      if (!active || checkingRef.current) {
        return;
      }
      checkingRef.current = true;
      try {
        const status = await checkDesktopUpdate();
        if (!active || !status || status.error || !status.updateAvailable) {
          return;
        }

        const token = buildUpdateToken(status.currentVersion, status.latestVersion);
        const alreadyNotified = window.sessionStorage.getItem(UPDATE_NOTICE_STORAGE_KEY) === token;
        if (alreadyNotified) {
          return;
        }

        // In-app toast (ephemeral)
        info(
          'Update Available',
          `Kairos ${status.latestVersion} is available. Open Settings and use Download Update.`,
          { durationMs: 8000 },
        );

        // Persistent notification in the bell icon panel
        addNotificationIfNew({
          title: 'Update Available',
          body: `Kairos ${status.latestVersion} is ready. Open What's New, then download when you're ready.`,
          category: 'Updates',
          action: { type: 'navigate', target: '/settings?changelog=latest' },
        });

        // OS-level notification (best-effort)
        try {
          const notificationsAvailable = await IsNotificationAvailable();
          if (notificationsAvailable) {
            let authorized = await CheckNotificationAuthorization();
            if (!authorized) {
              authorized = await RequestNotificationAuthorization();
            }
            if (authorized) {
              await InitializeNotifications();
              await SendNotification({
                id: `kairos-update-${status.latestVersion}`,
                title: 'Kairos Update Available',
                body: `Version ${status.latestVersion} is ready. Open Kairos Settings to download.`,
              });
            }
          }
        } catch {
          // Ignore desktop notification transport failures and keep toast behavior.
        }

        window.sessionStorage.setItem(UPDATE_NOTICE_STORAGE_KEY, token);
      } finally {
        checkingRef.current = false;
      }
    };

    void runCheck();
    const intervalId = window.setInterval(() => {
      void runCheck();
    }, UPDATE_CHECK_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [info]);

  return null;
}
