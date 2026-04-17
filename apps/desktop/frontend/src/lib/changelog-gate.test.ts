import { describe, expect, it } from 'vitest';
import { normalizeAppVersion, shouldAutoOpenChangelog } from '@/lib/changelog-gate';

describe('changelog gate helpers', () => {
  it('normalizes versions by trimming and removing leading v', () => {
    expect(normalizeAppVersion(' v1.2.3 ')).toBe('1.2.3');
    expect(normalizeAppVersion('1.2.3')).toBe('1.2.3');
    expect(normalizeAppVersion('')).toBe('');
  });

  it('opens changelog when installed version differs from last seen', () => {
    expect(shouldAutoOpenChangelog('1.2.4', '1.2.3')).toBe(true);
  });

  it('does not auto-open changelog when version already seen', () => {
    expect(shouldAutoOpenChangelog('v1.2.4', '1.2.4')).toBe(false);
  });
});
