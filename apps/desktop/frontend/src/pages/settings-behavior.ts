import type { AppBehaviorSettings } from '@/data/mockSettings';

export function withLaunchOnStartup(state: AppBehaviorSettings, launchOnStartup: boolean): AppBehaviorSettings {
  return {
    ...state,
    launchOnStartup,
  };
}

export function withOpenOnSystemLogin(state: AppBehaviorSettings, openOnSystemLogin: boolean): AppBehaviorSettings {
  return {
    ...state,
    openOnSystemLogin,
  };
}

export function canConfigureStartupWindowBehavior(osPlatform: string): boolean {
  return osPlatform.trim().toLowerCase() !== 'linux';
}
