import { describe, expect, it, vi } from 'vitest';
import { applyThemeMode, resolveEffectiveTheme, subscribeToSystemThemeChange } from '@/lib/theme-mode';

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

describe('resolveEffectiveTheme', () => {
  it('resolves explicit light/dark directly', () => {
    expect(resolveEffectiveTheme('light', mockWindow(true) as unknown as Window)).toBe('light');
    expect(resolveEffectiveTheme('dark', mockWindow(false) as unknown as Window)).toBe('dark');
  });

  it('resolves system mode from media query', () => {
    expect(resolveEffectiveTheme('system', mockWindow(true) as unknown as Window)).toBe('dark');
    expect(resolveEffectiveTheme('system', mockWindow(false) as unknown as Window)).toBe('light');
  });
});

describe('applyThemeMode', () => {
  it('applies dark mode class and data-theme attribute', () => {
    const doc = mockDocument();
    const win = mockWindow(true);
    const effective = applyThemeMode('system', doc as unknown as Document, win as unknown as Window);

    expect(effective).toBe('dark');
    expect(doc.documentElement.classList.contains('dark')).toBe(true);
    expect(doc.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('removes dark markers in light mode', () => {
    const doc = mockDocument();
    const win = mockWindow(false);
    applyThemeMode('dark', doc as unknown as Document, win as unknown as Window);
    const effective = applyThemeMode('light', doc as unknown as Document, win as unknown as Window);

    expect(effective).toBe('light');
    expect(doc.documentElement.classList.contains('dark')).toBe(false);
    expect(doc.documentElement.hasAttribute('data-theme')).toBe(false);
  });
});

describe('subscribeToSystemThemeChange', () => {
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
