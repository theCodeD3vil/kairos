export type SyncIndicatorState = 'idle' | 'in-progress' | 'success' | 'warning' | 'error';

export type SyncStatusApi = {
  begin: (message?: string) => string;
  succeed: (token: string, message?: string) => void;
  warn: (token: string, message?: string) => void;
  fail: (token: string, message?: string) => void;
  clear: () => void;
};

export type SyncOperationOptions = {
  inProgressMessage?: string;
  successMessage?: string;
  errorMessage?: string;
};

let activeSyncStatusApi: SyncStatusApi | null = null;

export function registerSyncStatusApi(api: SyncStatusApi | null): void {
  activeSyncStatusApi = api;
}

function missingSyncStatusApi() {
  if (import.meta.env.DEV) {
    console.warn('Sync status provider is not mounted yet.');
  }
}

export function beginSync(message?: string): string {
  if (!activeSyncStatusApi) {
    missingSyncStatusApi();
    return '';
  }
  return activeSyncStatusApi.begin(message);
}

export function succeedSync(token: string, message?: string): void {
  if (!activeSyncStatusApi || token === '') {
    return;
  }
  activeSyncStatusApi.succeed(token, message);
}

export function warnSync(token: string, message?: string): void {
  if (!activeSyncStatusApi || token === '') {
    return;
  }
  activeSyncStatusApi.warn(token, message);
}

export function failSync(token: string, message?: string): void {
  if (!activeSyncStatusApi || token === '') {
    return;
  }
  activeSyncStatusApi.fail(token, message);
}

export function clearSyncStatus(): void {
  if (!activeSyncStatusApi) {
    return;
  }
  activeSyncStatusApi.clear();
}

export async function trackSyncOperation<T>(
  operation: () => Promise<T>,
  options: SyncOperationOptions = {},
): Promise<T> {
  const token = beginSync(options.inProgressMessage);

  try {
    const result = await operation();
    succeedSync(token, options.successMessage);
    return result;
  } catch (error) {
    failSync(token, options.errorMessage);
    throw error;
  }
}
