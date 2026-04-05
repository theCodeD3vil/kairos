import { ButtonDropdown } from '@/components/ruixen/button-dropdown';
import { OverviewRangeSelector } from '@/components/overview/OverviewRangeSelector';
import type { OverviewRange } from '@/components/overview/types';
import type { AnalyticsFilters } from '@/data/mockAnalytics';
import type { DateRange } from '@/components/ruixen/range-calendar';

type AnalyticsFiltersProps = {
  filters: AnalyticsFilters;
  onChange: (next: AnalyticsFilters) => void;
  projectOptions: string[];
  languageOptions: string[];
  machineOptions: string[];
};

export function AnalyticsFilters({
  filters,
  onChange,
  projectOptions,
  languageOptions,
  machineOptions,
}: AnalyticsFiltersProps) {
  const update = (partial: Partial<AnalyticsFilters>) => onChange({ ...filters, ...partial });

  const dropdown = (label: string, value: string, options: string[], key: 'project' | 'language' | 'machine') => {
    const items = [
      { label: `All ${label}`, onClick: () => update({ [key]: 'all' } as Partial<AnalyticsFilters>) },
      ...options.map((option) => ({
        label: option,
        onClick: () => update({ [key]: option } as Partial<AnalyticsFilters>),
      })),
    ];
    const currentLabel =
      value === 'all' ? `All ${label}` : options.find((opt) => opt === value) ?? `All ${label}`;

    return <ButtonDropdown label={currentLabel} items={items} />;
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <OverviewRangeSelector
        value={filters.range as OverviewRange}
        onChange={(range) => update({ range })}
        customRange={filters.customRange ?? null}
        onCustomRangeChange={(next: DateRange | null) => update({ customRange: next })}
      />
      {dropdown('Projects', filters.project, projectOptions, 'project')}
      {dropdown('Languages', filters.language, languageOptions, 'language')}
      {dropdown('Machines', filters.machine, machineOptions, 'machine')}
    </div>
  );
}
