import type { OverviewRange } from '@/components/overview/types';
import { overviewRanges } from '@/components/overview/mock-data';
import SegmentedButton from '@/components/ui/segmented-button';

type OverviewRangeSelectorProps = {
  value: OverviewRange;
  onChange: (value: OverviewRange) => void;
};

export function OverviewRangeSelector({ value, onChange }: OverviewRangeSelectorProps) {
  const buttons = overviewRanges.map((range) => ({
    id: range.value,
    label: range.label,
  }));

  return (
    <SegmentedButton
      buttons={buttons}
      value={value}
      onChange={(activeId) => onChange(activeId as OverviewRange)}
    />
  );
}
