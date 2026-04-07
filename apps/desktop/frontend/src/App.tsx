import { BrowserRouter } from 'react-router-dom';
import { DesktopBootstrapGate } from '@/app/DesktopBootstrapGate';
import { DesktopDataProvider } from '@/app/DesktopDataContext';
import { UpdateNotifier } from '@/app/UpdateNotifier';
import { AppRoutes } from '@/app/routes';
import { SyncStatusProvider } from '@/components/sync/SyncStatusProvider';
import { ToastProvider } from '@/components/toast/ToastProvider';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SyncStatusProvider>
          <DesktopDataProvider>
            <DesktopBootstrapGate>
              <UpdateNotifier />
              <AppRoutes />
            </DesktopBootstrapGate>
          </DesktopDataProvider>
        </SyncStatusProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
