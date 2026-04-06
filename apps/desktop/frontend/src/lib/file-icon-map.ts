import { defaultStyles, type FileIconStyle } from 'react-file-icon';

export type FileIconDefinition = {
  canonicalKey: string;
  extensionLabel: string;
  style: FileIconStyle;
};

const styles = defaultStyles as Record<string, FileIconStyle>;

function withDefaultStyle(key: string, extensionLabel: string, overrides: FileIconStyle = {}): FileIconDefinition {
  return {
    canonicalKey: key,
    extensionLabel,
    style: {
      ...(styles[key] ?? {}),
      ...overrides,
    },
  };
}

function customStyle(
  canonicalKey: string,
  extensionLabel: string,
  style: FileIconStyle,
): FileIconDefinition {
  return {
    canonicalKey,
    extensionLabel,
    style,
  };
}

export const fallbackFileIcon = customStyle('file', 'file', {
  type: 'document',
  labelColor: '#8A94A6',
  labelTextColor: '#FFFFFF',
});

export const fileExtensionDefinitions: Record<string, FileIconDefinition> = {
  ts: withDefaultStyle('ts', 'ts'),
  tsx: withDefaultStyle('tsx', 'tsx', styles.jsx ?? { labelColor: '#00D8FF', type: 'code' }),
  js: withDefaultStyle('js', 'js'),
  jsx: withDefaultStyle('jsx', 'jsx'),
  mjs: withDefaultStyle('mjs', 'mjs', styles.js ?? { labelColor: '#F7DF1E', type: 'code' }),
  cjs: withDefaultStyle('cjs', 'cjs', styles.js ?? { labelColor: '#F7DF1E', type: 'code' }),
  go: customStyle('go', 'go', { labelColor: '#00ADD8', type: 'code' }),
  rs: customStyle('rs', 'rs', { labelColor: '#DEA584', type: 'code' }),
  py: withDefaultStyle('py', 'py'),
  java: withDefaultStyle('java', 'java'),
  c: withDefaultStyle('c', 'c'),
  cpp: withDefaultStyle('cpp', 'cpp'),
  h: customStyle('h', 'h', { ...(styles.c ?? { type: 'code' }), labelColor: '#5C6BC0' }),
  cs: withDefaultStyle('cs', 'cs'),
  php: withDefaultStyle('php', 'php'),
  rb: withDefaultStyle('rb', 'rb'),
  swift: customStyle('swift', 'swift', { labelColor: '#F05138', type: 'code' }),
  kt: customStyle('kt', 'kt', { labelColor: '#A97BFF', type: 'code' }),
  scala: customStyle('scala', 'scala', { labelColor: '#DC322F', type: 'code' }),
  json: withDefaultStyle('json', 'json'),
  md: withDefaultStyle('md', 'md'),
  txt: withDefaultStyle('txt', 'txt'),
  yml: withDefaultStyle('yml', 'yml'),
  yaml: withDefaultStyle('yaml', 'yaml', styles.yml ?? { type: 'code', labelColor: '#CB171E' }),
  toml: customStyle('toml', 'toml', { labelColor: '#9C4221', type: 'settings' }),
  xml: customStyle('xml', 'xml', { labelColor: '#FF6F61', type: 'code' }),
  html: withDefaultStyle('html', 'html'),
  css: withDefaultStyle('css', 'css'),
  scss: withDefaultStyle('scss', 'scss'),
  sass: withDefaultStyle('sass', 'sass', styles.scss ?? { labelColor: '#C16A98', type: 'code' }),
  less: customStyle('less', 'less', { labelColor: '#1D365D', type: 'code' }),
  sql: customStyle('sql', 'sql', { labelColor: '#336791', type: 'code' }),
  sh: customStyle('sh', 'sh', { labelColor: '#4EAA25', type: 'code' }),
  bash: customStyle('bash', 'bash', { labelColor: '#4EAA25', type: 'code' }),
  zsh: customStyle('zsh', 'zsh', { labelColor: '#89E051', type: 'code' }),
  env: customStyle('env', 'env', { labelColor: '#5C8D4D', type: 'settings' }),
  docker: customStyle('docker', 'docker', { labelColor: '#2496ED', type: 'settings' }),
  git: customStyle('git', 'git', { labelColor: '#F1502F', type: 'settings' }),
  npm: customStyle('npm', 'npm', { labelColor: '#CB3837', type: 'settings' }),
  pnpm: customStyle('pnpm', 'pnpm', { labelColor: '#F69220', type: 'settings' }),
  yarn: customStyle('yarn', 'yarn', { labelColor: '#2C8EBB', type: 'settings' }),
  eslint: customStyle('eslint', 'eslint', { labelColor: '#4B32C3', type: 'settings' }),
  prettier: customStyle('prettier', 'pretty', { labelColor: '#F7B93E', type: 'settings' }),
  vite: customStyle('vite', 'vite', { labelColor: '#8B5CF6', type: 'code' }),
  next: customStyle('next', 'next', { labelColor: '#111827', type: 'code' }),
  make: customStyle('make', 'make', { labelColor: '#6B7280', type: 'settings' }),
  config: customStyle('config', 'cfg', { labelColor: '#6B7280', type: 'settings' }),
};

export const specialFilenameDefinitions: Record<string, FileIconDefinition> = {
  'package.json': fileExtensionDefinitions.npm,
  'package-lock.json': fileExtensionDefinitions.npm,
  'pnpm-lock.yaml': fileExtensionDefinitions.pnpm,
  'yarn.lock': fileExtensionDefinitions.yarn,
  'tsconfig.json': fileExtensionDefinitions.ts,
  'jsconfig.json': fileExtensionDefinitions.js,
  'vite.config.ts': fileExtensionDefinitions.vite,
  'vite.config.js': fileExtensionDefinitions.vite,
  'next.config.js': fileExtensionDefinitions.next,
  'next.config.mjs': fileExtensionDefinitions.next,
  'dockerfile': fileExtensionDefinitions.docker,
  'docker-compose.yml': fileExtensionDefinitions.docker,
  'docker-compose.yaml': fileExtensionDefinitions.docker,
  '.gitignore': fileExtensionDefinitions.git,
  '.gitattributes': fileExtensionDefinitions.git,
  '.npmrc': fileExtensionDefinitions.npm,
  '.prettierrc': fileExtensionDefinitions.prettier,
  '.prettierrc.js': fileExtensionDefinitions.prettier,
  '.prettierrc.cjs': fileExtensionDefinitions.prettier,
  '.prettierrc.json': fileExtensionDefinitions.prettier,
  '.eslintrc': fileExtensionDefinitions.eslint,
  '.eslintrc.js': fileExtensionDefinitions.eslint,
  '.eslintrc.cjs': fileExtensionDefinitions.eslint,
  '.eslintrc.json': fileExtensionDefinitions.eslint,
  'readme.md': fileExtensionDefinitions.md,
  'makefile': fileExtensionDefinitions.make,
  'go.mod': fileExtensionDefinitions.go,
  'go.sum': fileExtensionDefinitions.go,
  '.editorconfig': fileExtensionDefinitions.config,
  '.nvmrc': fileExtensionDefinitions.npm,
};

export function resolveEnvSpecialDefinition(normalizedBasename: string) {
  if (normalizedBasename === '.env' || normalizedBasename.startsWith('.env.')) {
    return fileExtensionDefinitions.env;
  }

  return null;
}
