import { describe, expect, it } from 'vitest';
import {
  representativeFilenameForLanguage,
  resolveKairosFileIcon,
  resolveKairosFileIconSync,
} from '@/lib/file-icons';

describe('resolveKairosFileIcon', () => {
  it('extracts filenames from paths', async () => {
    await expect(resolveKairosFileIcon('src/components/App.tsx')).resolves.toMatchObject({
      basename: 'App.tsx',
      classList: ['icon', 'tsx-icon', 'light-blue'],
      resolutionSource: 'file-icons-js',
    });

    await expect(resolveKairosFileIcon('C:\\Projects\\kairos\\main.go')).resolves.toMatchObject({
      basename: 'main.go',
      classList: ['icon', 'go-icon', 'medium-blue'],
      resolutionSource: 'file-icons-js',
    });
  });

  it('matches special filenames and dotfiles through file-icons-js', async () => {
    await expect(resolveKairosFileIcon('Dockerfile')).resolves.toMatchObject({
      classList: ['icon', 'docker-icon', 'dark-blue'],
    });

    await expect(resolveKairosFileIcon('docker-compose.yml')).resolves.toMatchObject({
      classList: ['icon', 'docker-icon', 'dark-blue'],
    });

    await expect(resolveKairosFileIcon('.gitignore')).resolves.toMatchObject({
      classList: ['icon', 'git-icon', 'medium-red'],
    });

    await expect(resolveKairosFileIcon('.env.local')).resolves.toMatchObject({
      classList: ['icon', 'gear-icon', 'dark-green'],
    });
  });

  it('handles multi-dot and special config filenames', async () => {
    await expect(resolveKairosFileIcon('vite.config.ts')).resolves.toMatchObject({
      classList: ['icon', 'ts-icon', 'medium-blue'],
    });

    await expect(resolveKairosFileIcon('go.mod')).resolves.toMatchObject({
      classList: ['icon', 'config-go-icon', 'dark-blue'],
    });

    await expect(resolveKairosFileIcon('go.sum')).resolves.toMatchObject({
      classList: ['icon', 'config-go-icon', 'medium-green'],
    });
  });

  it('uses deterministic fallback for unknown files', async () => {
    await expect(resolveKairosFileIcon('unknown.weirdext')).resolves.toMatchObject({
      classList: ['icon', 'default-icon'],
      resolutionSource: 'fallback',
      isFallback: true,
    });
  });
});

describe('resolveKairosFileIconSync', () => {
  it('returns the deterministic fallback before async resolution has populated the cache', () => {
    expect(resolveKairosFileIconSync('README.md')).toMatchObject({
      classList: ['icon', 'default-icon'],
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
