import type { AppBehaviorSettings } from '@/data/mockSettings';

export type MenubarPreset = AppBehaviorSettings['menubarPreset'];

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

export function canConfigureMenubarBehavior(osPlatform: string): boolean {
  return osPlatform.trim().toLowerCase() === 'darwin';
}

export function isMenubarPresetActive(preset: MenubarPreset): boolean {
  return preset !== 'none';
}

export function applyMenubarPreset(state: AppBehaviorSettings, preset: MenubarPreset): AppBehaviorSettings {
  switch (preset) {
    case 'full':
      return {
        ...state,
        menubarPreset: 'full',
        enableMenubar: true,
        showMenubarTimeline: true,
        showMenubarSession: true,
        loginLaunchMode: 'desktop',
      };
    case 'minimal':
      return {
        ...state,
        menubarPreset: 'minimal',
        enableMenubar: true,
        showMenubarTimeline: false,
        showMenubarSession: true,
        loginLaunchMode: 'menubar',
      };
    case 'off':
      return {
        ...state,
        menubarPreset: 'off',
        enableMenubar: false,
        showMenubarTimeline: false,
        showMenubarSession: false,
        loginLaunchMode: 'desktop',
      };
    case 'none':
    default:
      return {
        ...state,
        menubarPreset: 'none',
      };
  }
}
