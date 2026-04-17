import { describe, expect, it } from 'vitest';
import { resolveLatestActivityLabel } from '@/components/sessions/SessionDetailsDialog';

describe('SessionDetailsDialog latest activity label', () => {
  it('prefers explicit latest activity over start time', () => {
    expect(resolveLatestActivityLabel({
      startAt: 'Apr 13, 09:00',
      latestActivityAt: 'Apr 13, 12:11',
    })).toBe('Apr 13, 12:11');
  });

  it('falls back to start time when latest activity is not provided', () => {
    expect(resolveLatestActivityLabel({
      startAt: 'Apr 13, 09:00',
    })).toBe('Apr 13, 09:00');
  });
});
