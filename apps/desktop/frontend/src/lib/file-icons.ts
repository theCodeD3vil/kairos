import {
  catppuccinAvailableIconKeys,
  catppuccinFileExtensionToIconKey,
  catppuccinFileNameToIconKey,
  catppuccinLanguageIdToIconKey,
} from '@/lib/catppuccin-file-icons.generated';

export type KairosFileIconResolutionSource =
  | 'exact-filename'
  | 'extension'
  | 'language-id'
  | 'language-alias'
  | 'fallback';

export type ResolvedKairosFileIcon = {
  basename: string;
  normalizedBasename: string;
  iconKey: string;
  src: string;
  resolutionSource: KairosFileIconResolutionSource;
  isFallback: boolean;
};

const fallbackIconKey = '_file';
const iconBasePath = '/file-icons/catppuccin/latte';
const availableIconKeys = new Set<string>(catppuccinAvailableIconKeys);

const languageAliases: Record<string, string> = {
  golang: 'go',
  javascriptreact: 'javascript-react',
  js: 'javascript',
  jsx: 'javascript-react',
  markdown: 'markdown',
  md: 'markdown',
  mdc: 'markdown',
  plaintext: 'text',
  py: 'python',
  rs: 'rust',
  ts: 'typescript',
  tsx: 'typescript-react',
  typescriptreact: 'typescript-react',
  yml: 'yaml',
};

const languageQueryAliases: Record<string, string> = {
  react: 'typescriptreact',
};

function sanitizeInput(input: string) {
  return input.trim().replace(/[?#].*$/, '').replace(/\\/g, '/');
}

function basenameFromInput(input: string) {
  const sanitized = sanitizeInput(input);
  const segments = sanitized.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? sanitized;
}

function extensionCandidatesFromBasename(basename: string) {
  if (!basename || !basename.includes('.')) {
    return [];
  }

  const parts = basename.split('.');
  const candidates: string[] = [];

  for (let index = 1; index < parts.length; index += 1) {
    const candidate = parts.slice(index).join('.');
    if (candidate) {
      candidates.push(candidate);
    }
  }

  return candidates;
}

function buildResolution(
  input: string,
  iconKey: string,
  resolutionSource: KairosFileIconResolutionSource,
): ResolvedKairosFileIcon {
  const basename = basenameFromInput(input);
  const normalizedBasename = basename.toLowerCase();
  const resolvedKey = availableIconKeys.has(iconKey) ? iconKey : fallbackIconKey;
  const src = `${iconBasePath}/${resolvedKey}.svg`;
  const isFallback = resolvedKey === fallbackIconKey;

  return {
    basename,
    normalizedBasename,
    iconKey: resolvedKey,
    src,
    resolutionSource: resolvedKey === fallbackIconKey && resolutionSource !== 'fallback'
      ? 'fallback'
      : resolutionSource,
    isFallback,
  };
}

/**
 * Resolution order:
 * 1. upstream filename map
 * 2. upstream extension map, including multi-part suffixes like `d.ts`
 * 3. deterministic generic fallback
 */
export function resolveKairosFileIcon(input: string): ResolvedKairosFileIcon {
  const basename = basenameFromInput(input);
  const normalizedBasename = basename.toLowerCase();

  const exactMatch = catppuccinFileNameToIconKey[normalizedBasename];
  if (exactMatch) {
    return buildResolution(input, exactMatch, 'exact-filename');
  }

  for (const candidate of extensionCandidatesFromBasename(normalizedBasename)) {
    const extensionMatch = catppuccinFileExtensionToIconKey[candidate];
    if (extensionMatch) {
      return buildResolution(input, extensionMatch, 'extension');
    }
  }

  return buildResolution(input, fallbackIconKey, 'fallback');
}

export function resolveKairosLanguageIcon(
  language?: string | null,
): ResolvedKairosFileIcon {
  const normalized = language?.trim().toLowerCase();
  if (!normalized) {
    return buildResolution('file.txt', fallbackIconKey, 'fallback');
  }

  const queryLanguage = languageQueryAliases[normalized] ?? normalized;

  const directMatch = catppuccinLanguageIdToIconKey[queryLanguage];
  if (directMatch) {
    return buildResolution(queryLanguage, directMatch, 'language-id');
  }

  const aliasedMatch = languageAliases[queryLanguage];
  if (aliasedMatch) {
    return buildResolution(queryLanguage, aliasedMatch, 'language-alias');
  }

  return buildResolution(queryLanguage, fallbackIconKey, 'fallback');
}
