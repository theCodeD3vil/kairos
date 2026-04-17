import { useEffect, useMemo, useRef, useState } from 'react';
import { VercelTabs } from '@/components/ui/vercel-tabs';
import { OverviewLanguagesTab } from '@/components/overview/OverviewLanguagesTab';
import { OverviewProjectsTab } from '@/components/overview/OverviewProjectsTab';
import { OverviewRangeSelector } from '@/components/overview/OverviewRangeSelector';
import { OverviewSessionsTab } from '@/components/overview/OverviewSessionsTab';
import { OverviewStatusTab } from '@/components/overview/OverviewStatusTab';
import { OverviewTimeTab } from '@/components/overview/OverviewTimeTab';
import type { DateRange } from '@/components/ruixen/range-calendar';
import { MachineScopePlaceholder } from '@/components/system/MachineScopePlaceholder';
import { LiveRefreshIndicator } from '@/components/system/LiveRefreshIndicator';
import { normalizeOverviewRange, type OverviewRange, type OverviewSnapshot } from '@/components/overview/types';
import { Skeleton } from '@/components/ui/skeleton';
import { desktopResourceKeys } from '@/app/DesktopDataContext';
import { emptyOverviewSnapshot, loadOverviewSnapshot } from '@/lib/backend/page-data';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';
import { emptySettingsScreenData, loadSettingsScreenData } from '@/lib/backend/settings';
import { useDesktopResource } from '@/lib/hooks/useDesktopResource';
import { resolveRangeAfterCustomRangeChange } from '@/lib/overview-range';
import { getRangeStorageKey, readRangePreference, saveRangePreference } from '@/lib/settings/preferences';

export function OverviewPage() {
  const rangeTouchedRef = useRef(false);
  const [range, setRange] = useState<OverviewRange>('week');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [activeTab, setActiveTab] = useState('time');
  const { data: settingsData, hasResolvedOnce: hasResolvedSettings } = useDesktopResource({
    cacheKey: desktopResourceKeys.settings(),
    emptyValue: emptySettingsScreenData(),
    errorMessage: 'Unable to load desktop settings.',
    load: (options) => loadSettingsScreenData(options),
  });
  const emptySnapshot = useMemo(() => emptyOverviewSnapshot(range), [range]);
  const {
    data: snapshot,
    isInitialLoading,
    loadError,
    refreshPulseKey,
  } = useDesktopResource<OverviewSnapshot>({
    cacheKey: desktopResourceKeys.overview(range, customRange),
    emptyValue: emptySnapshot,
    errorMessage: 'Unable to load desktop overview data.',
    load: (options) => loadOverviewSnapshot(range, customRange, options),
  });

  useEffect(() => {
    if (!hasResolvedSettings || rangeTouchedRef.current) {
      return;
    }

    const restoreLast = settingsData.viewModel.appBehavior.restoreLastSelectedDateRange;
    const saved = restoreLast ? readRangePreference(getRangeStorageKey('overview')) : null;
    if (saved) {
      setRange(saved.range);
      setCustomRange(saved.customRange);
      rangeTouchedRef.current = true;
      return;
    }

    setRange(normalizeOverviewRange(settingsData.viewModel.general.defaultDateRange));
    setCustomRange(null);
    rangeTouchedRef.current = true;
  }, [
    hasResolvedSettings,
    settingsData.viewModel.appBehavior.restoreLastSelectedDateRange,
    settingsData.viewModel.general.defaultDateRange,
  ]);

  useEffect(() => {
    if (!rangeTouchedRef.current) {
      return;
    }
    saveRangePreference(getRangeStorageKey('overview'), range, customRange);
  }, [customRange, range]);

  const handleRangeChange = (nextRange: OverviewRange) => {
    rangeTouchedRef.current = true;
    setRange(nextRange);
  };

  const tabs = [
    { label: 'Time', value: 'time', content: <OverviewTimeTab snapshot={snapshot} /> },
    { label: 'Projects', value: 'projects', content: <OverviewProjectsTab snapshot={snapshot} /> },
    { label: 'Languages', value: 'languages', content: <OverviewLanguagesTab snapshot={snapshot} /> },
    { label: 'Sessions', value: 'sessions', content: <OverviewSessionsTab snapshot={snapshot} /> },
    { label: 'Status', value: 'status', content: <OverviewStatusTab snapshot={snapshot} /> },
  ];

  return (
    <div className="space-y-4">
      <section className="flex items-center justify-between rounded-[18px] bg-[var(--surface-strong)] p-4">
        <h1 className="text-2xl font-semibold text-[var(--ink-strong)]">Overview</h1>
        <div className="flex items-center gap-3">
          <LiveRefreshIndicator pulseKey={refreshPulseKey} />
          {SHOW_MULTI_MACHINE_UI ? (
            <MachineScopePlaceholder
              machines={snapshot.knownMachines}
              currentMachineName={snapshot.currentMachine.machineName}
            />
          ) : null}
          <OverviewRangeSelector
            value={range}
            onChange={handleRangeChange}
            customRange={customRange}
            onCustomRangeChange={(nextRange) => {
              rangeTouchedRef.current = true;
              setCustomRange(nextRange);
              setRange((current) => resolveRangeAfterCustomRangeChange(
                current,
                nextRange,
                normalizeOverviewRange(settingsData.viewModel.general.defaultDateRange),
              ));
            }}
          />
        </div>
      </section>

      <section className="rounded-[18px] bg-[var(--surface)] p-4">
        {loadError ? (
          <div className="mb-4 rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--ink-tertiary)]">
            {loadError}
          </div>
        ) : null}
        {isInitialLoading && !loadError ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
            <div className="grid gap-3 xl:grid-cols-2">
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
            </div>
            <Skeleton className="h-56" />
          </div>
        ) : (
          <VercelTabs
            tabs={tabs}
            defaultTab="time"
            value={activeTab}
            onValueChange={setActiveTab}
            className="items-start"
            stickyTabList
          />
        )}
      </section>
    </div>
  );
}
