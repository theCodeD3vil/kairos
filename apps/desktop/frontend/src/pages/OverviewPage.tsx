import { useMemo, useState } from 'react';
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
import type { OverviewRange, OverviewSnapshot } from '@/components/overview/types';
import { Skeleton } from '@/components/ui/skeleton';
import { desktopResourceKeys } from '@/app/DesktopDataContext';
import { emptyOverviewSnapshot, loadOverviewSnapshot } from '@/lib/backend/page-data';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';
import { useDesktopResource } from '@/lib/hooks/useDesktopResource';

export function OverviewPage() {
  const [range, setRange] = useState<OverviewRange>('week');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [activeTab, setActiveTab] = useState('time');
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
            onChange={setRange}
            customRange={customRange}
            onCustomRangeChange={(nextRange) => {
              setCustomRange(nextRange);
              if (nextRange) setRange('custom');
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
