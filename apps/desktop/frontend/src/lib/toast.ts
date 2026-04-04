import type { ToastPayload } from '@/lib/toast-controller';

export type ToastOptions = {
  durationMs?: number;
};

export type ToastApi = {
  notify: (payload: ToastPayload) => string;
  success: (title: string, body?: string, options?: ToastOptions) => string;
  error: (title: string, body?: string, options?: ToastOptions) => string;
  info: (title: string, body?: string, options?: ToastOptions) => string;
  dismiss: (id: string) => void;
};

let activeToastApi: ToastApi | null = null;

export function registerToastApi(api: ToastApi | null): void {
  activeToastApi = api;
}

const missingToastApi = () => {
  if (import.meta.env.DEV) {
    // Keep this silent in production; this is only a dev integration guard.
    console.warn('Toast provider is not mounted yet.');
  }
};

export const toast: ToastApi = {
  notify(payload) {
    if (!activeToastApi) {
      missingToastApi();
      return '';
    }
    return activeToastApi.notify(payload);
  },
  success(title, body, options) {
    if (!activeToastApi) {
      missingToastApi();
      return '';
    }
    return activeToastApi.success(title, body, options);
  },
  error(title, body, options) {
    if (!activeToastApi) {
      missingToastApi();
      return '';
    }
    return activeToastApi.error(title, body, options);
  },
  info(title, body, options) {
    if (!activeToastApi) {
      missingToastApi();
      return '';
    }
    return activeToastApi.info(title, body, options);
  },
  dismiss(id) {
    if (!activeToastApi) {
      missingToastApi();
      return;
    }
    activeToastApi.dismiss(id);
  },
};

