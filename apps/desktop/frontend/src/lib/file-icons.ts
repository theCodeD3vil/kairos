import type { FileIconStyle } from 'react-file-icon';
import {
  fallbackFileIcon,
  fileExtensionDefinitions,
  resolveEnvSpecialDefinition,
  specialFilenameDefinitions,
} from '@/lib/file-icon-map';
import { resolveFileIconsFallbackMatch } from '@/lib/file-icons-fallback';

export type KairosFileIconResolutionSource =
  | 'special-map'
  | 'extension-map'
  | 'file-icons-js'
  | 'fallback';

export type ResolvedKairosFileIcon = {
  basename: string;
  normalizedBasename: string;
  canonicalKey: string;
  extensionLabel: string;
  matchedExtension: string;
  resolutionSource: KairosFileIconResolutionSource;
  style: FileIconStyle;
  fileIconsClass?: string;
};

const extensionAliases: Record<string, string> = {
  bash: 'sh',
  conf: 'config',
  config: 'config',
  dockerfile: 'docker',
  env: 'env',
  gitignore: 'git',
  jpeg: 'image',
  jpg: 'image',
  markdown: 'md',
  plaintext: 'txt',
  shell: 'sh',
  shellscript: 'sh',
  text: 'txt',
  typescriptreact: 'tsx',
};

const fallbackResolutionCache = new Map<string, ResolvedKairosFileIcon | null>();
const fallbackResolutionPromises = new Map<string, Promise<ResolvedKairosFileIcon | null>>();

function basenameFromInput(input: string) {
  const sanitized = input.trim().replace(/[?#].*$/, '').replace(/\\/g, '/');
  const segments = sanitized.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? sanitized;
}

function rawExtensionFromBasename(basename: string) {
  if (!basename) {
    return '';
  }

  if (basename.startsWith('.') && basename.indexOf('.', 1) === -1) {
    return basename.slice(1);
  }

  const lastDotIndex = basename.lastIndexOf('.');
  if (lastDotIndex <= 0 || lastDotIndex === basename.length - 1) {
    return '';
  }

  return basename.slice(lastDotIndex + 1);
}

function normalizeExtension(extension: string) {
  return extensionAliases[extension] ?? extension;
}

function buildResolution(
  input: string,
  definition: {
    canonicalKey: string;
    extensionLabel: string;
    style: FileIconStyle;
  },
  resolutionSource: KairosFileIconResolutionSource,
  matchedExtension = '',
  fileIconsClass?: string,
): ResolvedKairosFileIcon {
  const basename = basenameFromInput(input);

  return {
    basename,
    normalizedBasename: basename.toLowerCase(),
    canonicalKey: definition.canonicalKey,
    extensionLabel: definition.extensionLabel,
    matchedExtension,
    resolutionSource,
    style: definition.style,
    fileIconsClass,
  };
}

function fallbackDefinitionForExtension(extension: string) {
  const normalized = normalizeExtension(extension.toLowerCase());

  if (normalized && fileExtensionDefinitions[normalized]) {
    return fileExtensionDefinitions[normalized];
  }

  if (normalized) {
    return {
      ...fallbackFileIcon,
      extensionLabel: normalized.slice(0, 4) || fallbackFileIcon.extensionLabel,
    };
  }

  return fallbackFileIcon;
}

function resolveFromExplicitMaps(input: string): ResolvedKairosFileIcon {
  const basename = basenameFromInput(input);
  const normalizedBasename = basename.toLowerCase();

  const envSpecial = resolveEnvSpecialDefinition(normalizedBasename);
  if (envSpecial) {
    return buildResolution(input, envSpecial, 'special-map', 'env');
  }

  const specialDefinition = specialFilenameDefinitions[normalizedBasename];
  if (specialDefinition) {
    return buildResolution(input, specialDefinition, 'special-map');
  }

  const rawExtension = rawExtensionFromBasename(normalizedBasename);
  const normalizedExtension = normalizeExtension(rawExtension);
  const extensionDefinition = fileExtensionDefinitions[normalizedExtension];

  if (extensionDefinition) {
    return buildResolution(input, extensionDefinition, 'extension-map', normalizedExtension);
  }

  const fallbackDefinition = fallbackDefinitionForExtension(rawExtension);
  return buildResolution(input, fallbackDefinition, 'fallback', rawExtension);
}

export function resolveKairosFileIconSync(input: string): ResolvedKairosFileIcon {
  const explicitResolution = resolveFromExplicitMaps(input);
  if (explicitResolution.resolutionSource !== 'fallback') {
    return explicitResolution;
  }

  const cachedFallbackResolution = fallbackResolutionCache.get(explicitResolution.normalizedBasename);
  return cachedFallbackResolution ?? explicitResolution;
}

async function resolveKairosFileIconViaFallback(input: string, initialResolution: ResolvedKairosFileIcon) {
  const cachedFallbackResolution = fallbackResolutionCache.get(initialResolution.normalizedBasename);
  if (cachedFallbackResolution !== undefined) {
    return cachedFallbackResolution;
  }

  const existingPromise = fallbackResolutionPromises.get(initialResolution.normalizedBasename);
  if (existingPromise) {
    return existingPromise;
  }

  const pendingResolution = resolveFileIconsFallbackMatch(initialResolution.basename)
    .then((fallbackMatch) => {
      const nextResolution = fallbackMatch
        ? buildResolution(
            input,
            fallbackMatch.definition,
            'file-icons-js',
            initialResolution.matchedExtension,
            fallbackMatch.fileIconsClass,
          )
        : null;

      fallbackResolutionCache.set(initialResolution.normalizedBasename, nextResolution);
      fallbackResolutionPromises.delete(initialResolution.normalizedBasename);
      return nextResolution;
    })
    .catch(() => {
      fallbackResolutionCache.set(initialResolution.normalizedBasename, null);
      fallbackResolutionPromises.delete(initialResolution.normalizedBasename);
      return null;
    });

  fallbackResolutionPromises.set(initialResolution.normalizedBasename, pendingResolution);
  return pendingResolution;
}

/**
 * Resolution order:
 * 1. Kairos explicit special filename map
 * 2. Kairos explicit extension map
 * 3. file-icons-js filename matcher
 * 4. deterministic generic fallback
 */
export async function resolveKairosFileIcon(input: string): Promise<ResolvedKairosFileIcon> {
  const explicitResolution = resolveFromExplicitMaps(input);

  if (explicitResolution.resolutionSource !== 'fallback') {
    return explicitResolution;
  }

  const fallbackResolution = await resolveKairosFileIconViaFallback(input, explicitResolution);
  return fallbackResolution ?? explicitResolution;
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
