import { describe, expect, it } from 'vitest';
import type { AppBehaviorSettings } from '@/data/mockSettings';
import {
  applyMenubarPreset,
  canConfigureMenubarBehavior,
  canConfigureStartupWindowBehavior,
  isMenubarPresetActive,
  withLaunchOnStartup,
  withOpenOnSystemLogin,
} from '@/pages/settings-behavior';

const baseState: AppBehaviorSettings = {
  launchOnStartup: false,
  startMinimized: false,
  minimizeToTray: true,
  openOnSystemLogin: false,
  enableMenubar: true,
  menubarPreset: 'none',
  showMenubarTimeline: true,
  showMenubarSession: true,
  loginLaunchMode: 'desktop',
  rememberLastSelectedPage: true,
  restoreLastSelectedDateRange: true,
  reopenLastViewedContext: true,
};

describe('settings behavior helpers', () => {
  it('updates launchOnStartup without mutating openOnSystemLogin', () => {
    const next = withLaunchOnStartup(baseState, true);
    expect(next.launchOnStartup).toBe(true);
    expect(next.openOnSystemLogin).toBe(false);
  });

  it('updates openOnSystemLogin without mutating launchOnStartup', () => {
    const next = withOpenOnSystemLogin(baseState, true);
    expect(next.openOnSystemLogin).toBe(true);
    expect(next.launchOnStartup).toBe(false);
  });

  it('disables startup window behavior controls only on linux', () => {
    expect(canConfigureStartupWindowBehavior('linux')).toBe(false);
    expect(canConfigureStartupWindowBehavior('darwin')).toBe(true);
    expect(canConfigureStartupWindowBehavior('windows')).toBe(true);
  });

  it('enables menubar behavior controls only on macOS', () => {
    expect(canConfigureMenubarBehavior('linux')).toBe(false);
    expect(canConfigureMenubarBehavior('windows')).toBe(false);
    expect(canConfigureMenubarBehavior('darwin')).toBe(true);
  });

  it('applies full menubar preset and locks key behaviors', () => {
    const next = applyMenubarPreset(baseState, 'full');
    expect(next.menubarPreset).toBe('full');
    expect(next.enableMenubar).toBe(true);
    expect(next.showMenubarTimeline).toBe(true);
    expect(next.showMenubarSession).toBe(true);
    expect(next.loginLaunchMode).toBe('desktop');
    expect(isMenubarPresetActive(next.menubarPreset)).toBe(true);
  });

  it('allows manual customization when preset is none', () => {
    const next = applyMenubarPreset(baseState, 'none');
    expect(next.menubarPreset).toBe('none');
    expect(isMenubarPresetActive(next.menubarPreset)).toBe(false);
  });
});
