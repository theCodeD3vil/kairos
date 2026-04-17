import { ButtonDropdown } from '@/components/ruixen/button-dropdown';
import { OverviewRangeSelector } from '@/components/overview/OverviewRangeSelector';
import type { OverviewRange } from '@/components/overview/types';
import type { AnalyticsFilters } from '@/data/mockAnalytics';
import type { DateRange } from '@/components/ruixen/range-calendar';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';
import { resolveRangeAfterCustomRangeChange } from '@/lib/overview-range';

type AnalyticsFiltersProps = {
  filters: AnalyticsFilters;
  onChange: (next: AnalyticsFilters) => void;
  projectOptions: string[];
  languageOptions: string[];
  machineOptions: string[];
  fallbackRange: Exclude<OverviewRange, 'custom'>;
};

export function AnalyticsFilters({
  filters,
  onChange,
  projectOptions,
  languageOptions,
  machineOptions,
  fallbackRange,
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
        onCustomRangeChange={(next: DateRange | null) => update({
          customRange: next,
          range: resolveRangeAfterCustomRangeChange(filters.range as OverviewRange, next, fallbackRange),
        })}
      />
      {dropdown('Projects', filters.project, projectOptions, 'project')}
      {dropdown('Languages', filters.language, languageOptions, 'language')}
      {SHOW_MULTI_MACHINE_UI ? dropdown('Machines', filters.machine, machineOptions, 'machine') : null}
    </div>
  );
}
