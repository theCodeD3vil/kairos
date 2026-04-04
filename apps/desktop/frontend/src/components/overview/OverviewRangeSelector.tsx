import type { OverviewRange } from '@/components/overview/types';
import { overviewRanges } from '@/components/overview/mock-data';

type OverviewRangeSelectorProps = {
  value: OverviewRange;
  onChange: (value: OverviewRange) => void;
};

export function OverviewRangeSelector({ value, onChange }: OverviewRangeSelectorProps) {
  return (
    <div className="inline-flex items-center rounded-full bg-[#dfe4e2] p-1">
      {overviewRanges.map((range) => (
        <button
          key={range.value}
          type="button"
          onClick={() => onChange(range.value)}
          className={`rounded-full px-4 py-1.5 text-sm ${
            value === range.value ? 'bg-[#0f4f58] text-white' : 'text-[#2e3f43]'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
