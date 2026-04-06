import { describe, expect, it } from 'vitest';
import {
  resolveKairosFileIcon,
  resolveKairosLanguageIcon,
} from '@/lib/file-icons';

describe('resolveKairosFileIcon', () => {
  it('extracts filenames from full paths', () => {
    expect(resolveKairosFileIcon('src/components/App.tsx')).toMatchObject({
      basename: 'App.tsx',
      iconKey: 'typescript-react',
      resolutionSource: 'extension',
      isFallback: false,
    });

    expect(resolveKairosFileIcon('C:\\Projects\\kairos\\main.go')).toMatchObject({
      basename: 'main.go',
      iconKey: 'go',
      resolutionSource: 'extension',
      isFallback: false,
    });
  });

  it('resolves upstream special filenames before extension checks', () => {
    expect(resolveKairosFileIcon('Dockerfile')).toMatchObject({
      iconKey: 'docker',
      resolutionSource: 'exact-filename',
    });

    expect(resolveKairosFileIcon('docker-compose.yml')).toMatchObject({
      iconKey: 'docker-compose',
      resolutionSource: 'exact-filename',
    });

    expect(resolveKairosFileIcon('package.json')).toMatchObject({
      iconKey: 'package-json',
      resolutionSource: 'exact-filename',
    });

    expect(resolveKairosFileIcon('pnpm-lock.yaml')).toMatchObject({
      iconKey: 'pnpm-lock',
      resolutionSource: 'exact-filename',
    });
  });

  it('handles dotfiles and config-style files', () => {
    expect(resolveKairosFileIcon('.env.local')).toMatchObject({
      iconKey: 'env',
      resolutionSource: 'exact-filename',
    });

    expect(resolveKairosFileIcon('.gitignore')).toMatchObject({
      iconKey: 'git',
      resolutionSource: 'exact-filename',
    });

    expect(resolveKairosFileIcon('.prettierrc')).toMatchObject({
      iconKey: 'prettier',
      resolutionSource: 'exact-filename',
    });
  });

  it('handles extension mappings deterministically, including multi-part suffixes', () => {
    expect(resolveKairosFileIcon('index.ts')).toMatchObject({ iconKey: 'typescript' });
    expect(resolveKairosFileIcon('Component.jsx')).toMatchObject({ iconKey: 'javascript-react' });
    expect(resolveKairosFileIcon('README.md')).toMatchObject({
      iconKey: 'readme',
      resolutionSource: 'exact-filename',
    });
    expect(resolveKairosFileIcon('settings.yaml')).toMatchObject({ iconKey: 'yaml' });
    expect(resolveKairosFileIcon('config.toml')).toMatchObject({ iconKey: 'toml' });
    expect(resolveKairosFileIcon('index.test.ts')).toMatchObject({
      iconKey: 'typescript-test',
      resolutionSource: 'extension',
    });
    expect(resolveKairosFileIcon('styles.css.map')).toMatchObject({ iconKey: 'css-map' });
  });

  it('uses a deterministic generic fallback for unknown files', () => {
    expect(resolveKairosFileIcon('unknown.weirdext')).toMatchObject({
      iconKey: '_file',
      resolutionSource: 'fallback',
      isFallback: true,
    });

    expect(resolveKairosFileIcon('LICENSE')).toMatchObject({
      iconKey: 'license',
      resolutionSource: 'exact-filename',
      isFallback: false,
    });
  });
});

describe('resolveKairosLanguageIcon', () => {
  it('resolves upstream language ids directly', () => {
    expect(resolveKairosLanguageIcon('typescriptreact')).toMatchObject({
      iconKey: 'typescript-react',
      resolutionSource: 'language-id',
      isFallback: false,
    });

    expect(resolveKairosLanguageIcon('plaintext')).toMatchObject({
      iconKey: 'text',
      resolutionSource: 'language-id',
      isFallback: false,
    });
  });

  it('supports local aliases for language names not exposed upstream', () => {
    expect(resolveKairosLanguageIcon('mdc')).toMatchObject({
      iconKey: 'markdown',
      resolutionSource: 'language-alias',
      isFallback: false,
    });
  });

  it('falls back deterministically for unknown languages', () => {
    expect(resolveKairosLanguageIcon('madeuplang')).toMatchObject({
      iconKey: '_file',
      resolutionSource: 'fallback',
      isFallback: true,
    });
  });
});
