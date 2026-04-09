import { describe, expect, it } from 'vitest';
import { landingLinks } from '@/lib/links';

describe('landingLinks', () => {
  it('contains only absolute https links', () => {
    Object.values(landingLinks).forEach((value) => {
      expect(value.startsWith('https://')).toBe(true);
    });
  });

  it('keeps required release and extension links', () => {
    expect(landingLinks.releasesLatest).toContain('/releases/latest');
    expect(landingLinks.readmeVsCodeSection).toContain('#vs-code-extension');
  });
});
