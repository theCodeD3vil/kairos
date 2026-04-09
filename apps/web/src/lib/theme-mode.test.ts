import { describe, expect, it, vi } from 'vitest';
import {
  applyThemeMode,
  loadThemeMode,
  resolveEffectiveTheme,
  saveThemeMode,
  subscribeToSystemThemeChange,
  THEME_STORAGE_KEY,
} from '@/lib/theme-mode';

function mockWindow(matches: boolean) {
  const listeners = new Set<() => void>();
  const media = {
    matches,
    addEventListener: vi.fn((_: string, cb: () => void) => listeners.add(cb)),
    removeEventListener: vi.fn((_: string, cb: () => void) => listeners.delete(cb)),
    addListener: vi.fn((cb: () => void) => listeners.add(cb)),
    removeListener: vi.fn((cb: () => void) => listeners.delete(cb)),
    emit() {
      listeners.forEach((listener) => listener());
    },
  };

  return {
    matchMedia: vi.fn(() => media),
    media,
  };
}

function mockDocument() {
  const classes = new Set<string>();
  const attributes = new Map<string, string>();
  return {
    documentElement: {
      classList: {
        add: (name: string) => classes.add(name),
        remove: (name: string) => classes.delete(name),
        contains: (name: string) => classes.has(name),
      },
      setAttribute: (key: string, value: string) => attributes.set(key, value),
      removeAttribute: (key: string) => attributes.delete(key),
      hasAttribute: (key: string) => attributes.has(key),
      getAttribute: (key: string) => attributes.get(key) ?? null,
    },
  };
}

describe('theme mode', () => {
  it('resolves explicit and system themes', () => {
    expect(resolveEffectiveTheme('light', mockWindow(true) as unknown as Window)).toBe('light');
    expect(resolveEffectiveTheme('dark', mockWindow(false) as unknown as Window)).toBe('dark');
    expect(resolveEffectiveTheme('system', mockWindow(true) as unknown as Window)).toBe('dark');
  });

  it('applies theme markers on document element', () => {
    const doc = mockDocument();
    const win = mockWindow(true);

    applyThemeMode('system', doc as unknown as Document, win as unknown as Window);
    expect(doc.documentElement.classList.contains('dark')).toBe(true);
    expect(doc.documentElement.getAttribute('data-theme')).toBe('dark');

    applyThemeMode('light', doc as unknown as Document, win as unknown as Window);
    expect(doc.documentElement.classList.contains('dark')).toBe(false);
    expect(doc.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('loads and saves theme mode in storage', () => {
    const storage = new Map<string, string>();
    const getItem = (key: string) => storage.get(key) ?? null;
    const setItem = (key: string, value: string) => {
      storage.set(key, value);
    };

    expect(loadThemeMode({ getItem } as Pick<Storage, 'getItem'>)).toBe('system');
    saveThemeMode('dark', { setItem } as Pick<Storage, 'setItem'>);
    expect(storage.get(THEME_STORAGE_KEY)).toBe('dark');
    expect(loadThemeMode({ getItem } as Pick<Storage, 'getItem'>)).toBe('dark');
  });

  it('subscribes and unsubscribes from media query changes', () => {
    const win = mockWindow(false);
    const callback = vi.fn();

    const unsubscribe = subscribeToSystemThemeChange(callback, win as unknown as Window);
    win.media.emit();
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    win.media.emit();
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
