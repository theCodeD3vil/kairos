import type { OverviewRange } from '@/components/overview/types';
import type { DateRange } from '@/components/ruixen/range-calendar';

export function resolveRangeAfterCustomRangeChange(
  currentRange: OverviewRange,
  nextRange: DateRange | null,
  fallbackRange: Exclude<OverviewRange, 'custom'> = 'week',
): OverviewRange {
  if (nextRange) {
    return 'custom';
  }

  if (currentRange === 'custom') {
    return fallbackRange;
  }

  return currentRange;
}
