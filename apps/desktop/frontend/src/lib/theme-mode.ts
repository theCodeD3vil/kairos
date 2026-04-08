export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

function systemPrefersDark(windowObject: Window = window): boolean {
  if (typeof windowObject.matchMedia !== 'function') {
    return false;
  }
  return windowObject.matchMedia(SYSTEM_DARK_QUERY).matches;
}

export function resolveEffectiveTheme(mode: ThemeMode, windowObject: Window = window): EffectiveTheme {
  if (mode === 'dark') {
    return 'dark';
  }
  if (mode === 'system') {
    return systemPrefersDark(windowObject) ? 'dark' : 'light';
  }
  return 'light';
}

export function applyThemeMode(mode: ThemeMode, documentObject: Document = document, windowObject: Window = window): EffectiveTheme {
  const effectiveTheme = resolveEffectiveTheme(mode, windowObject);
  const root = documentObject.documentElement;

  if (effectiveTheme === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
  } else {
    root.classList.remove('dark');
    root.removeAttribute('data-theme');
  }

  return effectiveTheme;
}

export function subscribeToSystemThemeChange(onChange: () => void, windowObject: Window = window): () => void {
  if (typeof windowObject.matchMedia !== 'function') {
    return () => {};
  }
  const mediaQuery = windowObject.matchMedia(SYSTEM_DARK_QUERY);
  const handler = () => onChange();

  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }

  mediaQuery.addListener(handler);
  return () => mediaQuery.removeListener(handler);
}
