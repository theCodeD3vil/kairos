import { HashRouter } from 'react-router-dom';
import { DesktopBootstrapGate } from '@/app/DesktopBootstrapGate';
import { DesktopDataProvider } from '@/app/DesktopDataContext';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { ThemeModeController } from '@/app/ThemeModeController';
import { UpdateNotifier } from '@/app/UpdateNotifier';
import { AppRoutes } from '@/app/routes';
import { SyncStatusProvider } from '@/components/sync/SyncStatusProvider';
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
                <UpdateNotifier />
                <AppRoutes />
              </DesktopBootstrapGate>
            </DesktopDataProvider>
          </SyncStatusProvider>
        </ToastProvider>
      </HashRouter>
    </ErrorBoundary>
  );
}
