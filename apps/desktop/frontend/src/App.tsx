import { HashRouter } from 'react-router-dom';
import { DesktopBootstrapGate } from '@/app/DesktopBootstrapGate';
import { DesktopDataProvider } from '@/app/DesktopDataContext';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { PostUpdateChangelogGate } from '@/app/PostUpdateChangelogGate';
import { ThemeModeController } from '@/app/ThemeModeController';
import { UpdateNotifier } from '@/app/UpdateNotifier';
import { AppRoutes } from '@/app/routes';
import { SyncStatusProvider } from '@/components/sync/SyncStatusProvider';
import { BackgroundSyncToast } from '@/components/system/BackgroundSyncToast';
import { ToastProvider } from '@/components/toast/ToastProvider';

export default function App() {
  return (
    <ErrorBoundary>
      <HashRouter>
        <ToastProvider>
          <SyncStatusProvider>
            <DesktopDataProvider>
              <DesktopBootstrapGate>
                <ThemeModeController />
                <PostUpdateChangelogGate />
                <UpdateNotifier />
                <AppRoutes />
                <BackgroundSyncToast />
              </DesktopBootstrapGate>
            </DesktopDataProvider>
          </SyncStatusProvider>
        </ToastProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
