import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@/app/routes';
import { ToastProvider } from '@/components/toast/ToastProvider';

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AppRoutes />
      </ToastProvider>
    </BrowserRouter>
  );
}
