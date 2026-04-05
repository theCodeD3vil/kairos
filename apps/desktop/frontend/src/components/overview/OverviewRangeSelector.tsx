import type { OverviewRange } from '@/components/overview/types';
import { overviewRanges } from '@/components/overview/mock-data';
import { type DateRange } from '@/components/ruixen/range-calendar';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import SegmentedButton from '@/components/ui/segmented-button';

type OverviewRangeSelectorProps = {
  value: OverviewRange;
  onChange: (value: OverviewRange) => void;
  customRange: DateRange | null;
  onCustomRangeChange: (range: DateRange | null) => void;
};

export function OverviewRangeSelector({
  value,
  onChange,
  customRange,
  onCustomRangeChange,
}: OverviewRangeSelectorProps) {
  const presetButtons = overviewRanges
    .filter((range) => range.value !== 'custom')
    .map((range) => ({
    id: range.value,
    label: range.label,
    }));

  return (
    <div className="flex items-center gap-2">
      <SegmentedButton
        buttons={presetButtons}
        value={value === 'custom' ? undefined : value}
        onChange={(activeId) => {
          onChange(activeId as OverviewRange);
        }}
        size="sm"
      />
      <DateRangePicker
        label="Custom"
        value={customRange}
        active={value === 'custom'}
        onChange={(nextRange) => {
          onCustomRangeChange(nextRange);
          if (nextRange) onChange('custom');
        }}
      />
    </div>
  );
}
