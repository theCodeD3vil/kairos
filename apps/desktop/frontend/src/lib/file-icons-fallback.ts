import fileIcons from '@exuanbo/file-icons-js';
import {
  fileExtensionDefinitions,
  type FileIconDefinition,
} from '@/lib/file-icon-map';

type FileIconsClassToken = string;

const fileIconsClassToCanonicalKey: Record<string, keyof typeof fileExtensionDefinitions> = {
  'book-icon': 'md',
  'config-go-icon': 'go',
  'config-icon': 'config',
  'docker-icon': 'docker',
  'editorconfig-icon': 'config',
  'eslint-icon': 'eslint',
  'gear-icon': 'config',
  'git-icon': 'git',
  'github-icon': 'git',
  'gitlab-icon': 'git',
  'heroku-icon': 'config',
  'hg-icon': 'git',
  'jest-icon': 'config',
  'node-icon': 'npm',
  'npm-icon': 'npm',
  'package-icon': 'config',
  'pnpm-icon': 'pnpm',
  'prettier-icon': 'prettier',
  'terminal-icon': 'sh',
  'yarn-icon': 'yarn',
};

// `file-icons-js` gives us better VS Code-like filename matching, but Kairos still
// renders with `react-file-icon`. Only classes that map cleanly into our canonical
// renderer keys should be added here.

export type FileIconsFallbackMatch = {
  canonicalKey: string;
  definition: FileIconDefinition;
  fileIconsClass: string;
};

function extractIconClass(tokens: FileIconsClassToken[]) {
  return tokens.find((token) => token.endsWith('-icon')) ?? null;
}

function toArray(result: string | string[]) {
  if (Array.isArray(result)) {
    return result;
  }

  return result.split(/\s+/).filter(Boolean);
}

export async function resolveFileIconsFallbackMatch(input: string): Promise<FileIconsFallbackMatch | null> {
  const result = await fileIcons.getClass(input, { color: true, array: true });
  const tokens = toArray(result);
  const fileIconsClass = extractIconClass(tokens);

  if (!fileIconsClass) {
    return null;
  }

  const canonicalKey = fileIconsClassToCanonicalKey[fileIconsClass];
  if (!canonicalKey) {
    return null;
  }

  const definition = fileExtensionDefinitions[canonicalKey];
  if (!definition) {
    return null;
  }

  return {
    canonicalKey: definition.canonicalKey,
    definition,
    fileIconsClass,
  };
}
