import { describe, expect, it } from 'vitest';
import type { AppBehaviorSettings } from '@/data/mockSettings';
import {
  canConfigureStartupWindowBehavior,
  withLaunchOnStartup,
  withOpenOnSystemLogin,
} from '@/pages/settings-behavior';

const baseState: AppBehaviorSettings = {
  launchOnStartup: false,
  startMinimized: false,
  minimizeToTray: true,
  openOnSystemLogin: false,
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
});
