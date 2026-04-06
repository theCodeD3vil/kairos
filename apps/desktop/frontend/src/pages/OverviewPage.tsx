import { useEffect, useMemo, useState } from 'react';
import { VercelTabs } from '@/components/ui/vercel-tabs';
import { OverviewLanguagesTab } from '@/components/overview/OverviewLanguagesTab';
import { OverviewProjectsTab } from '@/components/overview/OverviewProjectsTab';
import { OverviewRangeSelector } from '@/components/overview/OverviewRangeSelector';
import { OverviewSessionsTab } from '@/components/overview/OverviewSessionsTab';
import { OverviewStatusTab } from '@/components/overview/OverviewStatusTab';
import { OverviewTimeTab } from '@/components/overview/OverviewTimeTab';
import type { DateRange } from '@/components/ruixen/range-calendar';
import { MachineScopePlaceholder } from '@/components/system/MachineScopePlaceholder';
import type { OverviewRange, OverviewSnapshot } from '@/components/overview/types';
import { emptyOverviewSnapshot, loadOverviewSnapshot } from '@/lib/backend/page-data';

export function OverviewPage() {
  const [range, setRange] = useState<OverviewRange>('week');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [activeTab, setActiveTab] = useState('time');
  const emptySnapshot = useMemo(() => emptyOverviewSnapshot(range), [range]);
  const [snapshot, setSnapshot] = useState<OverviewSnapshot>(emptySnapshot);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadOverviewSnapshot(range, customRange)
      .then((nextSnapshot) => {
        if (!cancelled) {
          setLoadError(null);
          setSnapshot(nextSnapshot);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('Unable to load desktop overview data.');
          setSnapshot(emptySnapshot);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customRange, emptySnapshot, range]);

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
          <MachineScopePlaceholder
            machines={snapshot.knownMachines}
            currentMachineName={snapshot.currentMachine.machineName}
          />
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
        <VercelTabs
          tabs={tabs}
          defaultTab="time"
          value={activeTab}
          onValueChange={setActiveTab}
          className="items-start"
          stickyTabList
        />
      </section>
    </div>
  );
}
