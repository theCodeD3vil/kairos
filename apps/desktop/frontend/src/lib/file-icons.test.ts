import { describe, expect, it } from 'vitest';
import {
  representativeFilenameForLanguage,
  resolveKairosFileIcon,
  resolveKairosFileIconSync,
} from '@/lib/file-icons';

describe('resolveKairosFileIconSync', () => {
  it('resolves normal extensions', () => {
    expect(resolveKairosFileIconSync('index.ts')).toMatchObject({
      canonicalKey: 'ts',
      extensionLabel: 'ts',
      resolutionSource: 'extension-map',
    });
    expect(resolveKairosFileIconSync('App.tsx')).toMatchObject({
      canonicalKey: 'tsx',
      extensionLabel: 'tsx',
      resolutionSource: 'extension-map',
    });
    expect(resolveKairosFileIconSync('script.py')).toMatchObject({
      canonicalKey: 'py',
      extensionLabel: 'py',
      resolutionSource: 'extension-map',
    });
  });

  it('extracts filenames from paths', () => {
    expect(resolveKairosFileIconSync('src/components/App.tsx')).toMatchObject({
      basename: 'App.tsx',
      canonicalKey: 'tsx',
    });
    expect(resolveKairosFileIconSync('C:\\Projects\\kairos\\main.go')).toMatchObject({
      basename: 'main.go',
      canonicalKey: 'go',
    });
  });

  it('resolves special filenames before extension checks', () => {
    expect(resolveKairosFileIconSync('package.json')).toMatchObject({ canonicalKey: 'npm', resolutionSource: 'special-map' });
    expect(resolveKairosFileIconSync('tsconfig.json')).toMatchObject({ canonicalKey: 'ts', resolutionSource: 'special-map' });
    expect(resolveKairosFileIconSync('docker-compose.yml')).toMatchObject({ canonicalKey: 'docker', resolutionSource: 'special-map' });
    expect(resolveKairosFileIconSync('Dockerfile')).toMatchObject({ canonicalKey: 'docker', resolutionSource: 'special-map' });
    expect(resolveKairosFileIconSync('go.mod')).toMatchObject({ canonicalKey: 'go', resolutionSource: 'special-map' });
  });

  it('handles dotfiles and env files', () => {
    expect(resolveKairosFileIconSync('.gitignore')).toMatchObject({ canonicalKey: 'git', resolutionSource: 'special-map' });
    expect(resolveKairosFileIconSync('.env')).toMatchObject({ canonicalKey: 'env', resolutionSource: 'special-map' });
    expect(resolveKairosFileIconSync('.env.local')).toMatchObject({ canonicalKey: 'env', resolutionSource: 'special-map' });
    expect(resolveKairosFileIconSync('.npmrc')).toMatchObject({ canonicalKey: 'npm', resolutionSource: 'special-map' });
  });

  it('handles multi-dot filenames deterministically', () => {
    expect(resolveKairosFileIconSync('vite.config.ts')).toMatchObject({ canonicalKey: 'vite', resolutionSource: 'special-map' });
    expect(resolveKairosFileIconSync('next.config.mjs')).toMatchObject({ canonicalKey: 'next', resolutionSource: 'special-map' });
    expect(resolveKairosFileIconSync('archive.backup.tar')).toMatchObject({
      canonicalKey: 'file',
      extensionLabel: 'tar',
      resolutionSource: 'fallback',
    });
  });

  it('falls back safely for unknown files', () => {
    expect(resolveKairosFileIconSync('unknown.weirdext')).toMatchObject({
      canonicalKey: 'file',
      extensionLabel: 'weir',
      resolutionSource: 'fallback',
    });
    expect(resolveKairosFileIconSync('LICENSE')).toMatchObject({
      canonicalKey: 'file',
      extensionLabel: 'file',
      resolutionSource: 'fallback',
    });
  });
});

describe('resolveKairosFileIcon', () => {
  it('uses file-icons-js as a fallback matcher for uncommon filenames', async () => {
    await expect(resolveKairosFileIcon('Procfile')).resolves.toMatchObject({
      canonicalKey: 'config',
      resolutionSource: 'file-icons-js',
      fileIconsClass: 'heroku-icon',
    });

    await expect(resolveKairosFileIcon('.zshrc')).resolves.toMatchObject({
      canonicalKey: 'sh',
      resolutionSource: 'file-icons-js',
      fileIconsClass: 'terminal-icon',
    });
  });

  it('keeps deterministic generic fallback when file-icons-js cannot be mapped cleanly', async () => {
    await expect(resolveKairosFileIcon('unknown.weirdext')).resolves.toMatchObject({
      canonicalKey: 'file',
      extensionLabel: 'weir',
      resolutionSource: 'fallback',
    });
  });
});

describe('representativeFilenameForLanguage', () => {
  it('maps known languages to stable representative filenames', () => {
    expect(representativeFilenameForLanguage('typescriptreact')).toBe('Component.tsx');
    expect(representativeFilenameForLanguage('mdc')).toBe('README.md');
    expect(representativeFilenameForLanguage('plaintext')).toBe('notes.txt');
  });
});
