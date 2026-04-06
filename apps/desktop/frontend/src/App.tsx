import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@/app/routes';
import { SyncStatusProvider } from '@/components/sync/SyncStatusProvider';
import { ToastProvider } from '@/components/toast/ToastProvider';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <SyncStatusProvider>
          <AppRoutes />
        </SyncStatusProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
