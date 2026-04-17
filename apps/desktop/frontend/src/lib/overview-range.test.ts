import { describe, expect, it } from 'vitest';
import type { DateRange } from '@/components/ruixen/range-calendar';
import { resolveRangeAfterCustomRangeChange } from '@/lib/overview-range';

describe('resolveRangeAfterCustomRangeChange', () => {
  it('falls back to provided default when custom range is cleared while range is custom', () => {
    expect(resolveRangeAfterCustomRangeChange('custom', null, 'month')).toBe('month');
  });

  it('falls back to week when no explicit default is provided', () => {
    expect(resolveRangeAfterCustomRangeChange('custom', null)).toBe('week');
  });

  it('keeps current preset range when custom range is cleared outside custom mode', () => {
    expect(resolveRangeAfterCustomRangeChange('month', null)).toBe('month');
  });

  it('switches to custom when a custom range is provided', () => {
    const range: DateRange = {
      start: new Date('2026-04-01T00:00:00Z'),
      end: new Date('2026-04-13T00:00:00Z'),
    };
    expect(resolveRangeAfterCustomRangeChange('week', range)).toBe('custom');
  });
});
