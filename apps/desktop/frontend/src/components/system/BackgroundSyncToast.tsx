import { useEffect, useState } from 'react';
import { useDesktopData } from '@/app/DesktopDataContext';
import { cn } from '@/lib/utils';

const BACKGROUND_SYNC_TOAST_DELAY_MS = 500;

export function BackgroundSyncToastContent({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-full border border-[var(--loading-toast-border)] bg-[var(--loading-toast-bg)] px-3 py-2 text-xs font-semibold text-[var(--loading-toast-fg)] shadow-[var(--shadow-elevated)]',
        className,
      )}
    >
      <span
        className="size-3 rounded-full border-2 border-[var(--loading-toast-spinner-track)] border-t-[hsl(var(--secondary))] motion-safe:animate-spin"
        aria-hidden="true"
      />
      <span className="whitespace-nowrap">Syncing</span>
    </div>
  );
}

export function BackgroundSyncToast() {
  const { backgroundSyncing } = useDesktopData();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!backgroundSyncing) {
      setVisible(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, BACKGROUND_SYNC_TOAST_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [backgroundSyncing]);

  if (!visible) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-[64]" aria-live="polite" aria-atomic="true">
      <BackgroundSyncToastContent />
    </div>
  );
}
