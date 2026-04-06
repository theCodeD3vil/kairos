import fileIcons from '@exuanbo/file-icons-js';

export type KairosFileIconResolutionSource = 'file-icons-js' | 'fallback';

export type ResolvedKairosFileIcon = {
  basename: string;
  normalizedInput: string;
  className: string;
  classList: string[];
  resolutionSource: KairosFileIconResolutionSource;
  isFallback: boolean;
};

const FALLBACK_CLASS_LIST = ['icon', 'default-icon'];
const fallbackResolutionCache = new Map<string, ResolvedKairosFileIcon>();
const fallbackResolutionPromises = new Map<string, Promise<ResolvedKairosFileIcon>>();

function sanitizeInput(input: string) {
  return input.trim().replace(/[?#].*$/, '').replace(/\\/g, '/');
}

function basenameFromInput(input: string) {
  const sanitized = sanitizeInput(input);
  const segments = sanitized.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? sanitized;
}

function normalizeClassList(result: string | string[]) {
  if (Array.isArray(result)) {
    return result.filter(Boolean);
  }

  return result.split(/\s+/).filter(Boolean);
}

function buildResolution(
  input: string,
  classList: string[],
  resolutionSource: KairosFileIconResolutionSource,
): ResolvedKairosFileIcon {
  const normalizedInput = sanitizeInput(input);
  const basename = basenameFromInput(input);

  return {
    basename,
    normalizedInput,
    className: classList.join(' '),
    classList,
    resolutionSource,
    isFallback: resolutionSource === 'fallback',
  };
}

function fallbackResolution(input: string) {
  return buildResolution(input, FALLBACK_CLASS_LIST, 'fallback');
}

function isFallbackClassList(classList: string[]) {
  return !classList.some((token) => token.endsWith('-icon')) || classList.includes('default-icon');
}

function cacheKeyForInput(input: string) {
  return sanitizeInput(input).toLowerCase();
}

/**
 * Kairos now uses `@exuanbo/file-icons-js` exclusively for file icon matching and
 * rendering. We keep one deterministic fallback so unknown files still render a
 * stable generic icon instead of empty state.
 */
export function resolveKairosFileIconSync(input: string): ResolvedKairosFileIcon {
  return fallbackResolutionCache.get(cacheKeyForInput(input)) ?? fallbackResolution(input);
}

export async function resolveKairosFileIcon(input: string): Promise<ResolvedKairosFileIcon> {
  const key = cacheKeyForInput(input);
  const cachedResolution = fallbackResolutionCache.get(key);
  if (cachedResolution) {
    return cachedResolution;
  }

  const pendingResolution = fallbackResolutionPromises.get(key);
  if (pendingResolution) {
    return pendingResolution;
  }

  const resolutionPromise = fileIcons
    .getClass(sanitizeInput(input), { color: true, array: true })
    .then((result) => {
      const classList = normalizeClassList(result);
      const resolution = isFallbackClassList(classList)
        ? fallbackResolution(input)
        : buildResolution(input, classList, 'file-icons-js');

      fallbackResolutionCache.set(key, resolution);
      fallbackResolutionPromises.delete(key);
      return resolution;
    })
    .catch(() => {
      const resolution = fallbackResolution(input);
      fallbackResolutionCache.set(key, resolution);
      fallbackResolutionPromises.delete(key);
      return resolution;
    });

  fallbackResolutionPromises.set(key, resolutionPromise);
  return resolutionPromise;
}

export function representativeFilenameForLanguage(language?: string | null) {
  const normalized = language?.trim().toLowerCase();
  if (!normalized) {
    return 'file.txt';
  }

  const representativeFiles: Record<string, string> = {
    c: 'main.c',
    cpp: 'main.cpp',
    css: 'styles.css',
    go: 'main.go',
    golang: 'main.go',
    html: 'index.html',
    java: 'Main.java',
    javascript: 'index.js',
    javascriptreact: 'Component.jsx',
    js: 'index.js',
    json: 'package.json',
    jsx: 'Component.jsx',
    kotlin: 'Main.kt',
    kt: 'Main.kt',
    markdown: 'README.md',
    mdc: 'README.md',
    md: 'README.md',
    plaintext: 'notes.txt',
    py: 'script.py',
    python: 'script.py',
    rb: 'script.rb',
    rs: 'lib.rs',
    rust: 'lib.rs',
    sass: 'styles.sass',
    scala: 'Main.scala',
    scss: 'styles.scss',
    shellscript: 'script.sh',
    sh: 'script.sh',
    sql: 'query.sql',
    swift: 'App.swift',
    text: 'notes.txt',
    toml: 'config.toml',
    ts: 'index.ts',
    tsx: 'Component.tsx',
    typescript: 'index.ts',
    typescriptreact: 'Component.tsx',
    txt: 'notes.txt',
    xml: 'config.xml',
    yaml: 'docker-compose.yml',
    yml: 'docker-compose.yml',
    zsh: '.zshrc',
  };

  return representativeFiles[normalized] ?? `${normalized.slice(0, 8) || 'file'}.txt`;
}
