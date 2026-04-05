import { useMemo, useState } from 'react';
import { VercelTabs } from '@/components/ui/vercel-tabs';
import { OverviewLanguagesTab } from '@/components/overview/OverviewLanguagesTab';
import { getOverviewSnapshot } from '@/components/overview/mock-data';
import { OverviewProjectsTab } from '@/components/overview/OverviewProjectsTab';
import { OverviewRangeSelector } from '@/components/overview/OverviewRangeSelector';
import { OverviewSessionsTab } from '@/components/overview/OverviewSessionsTab';
import { OverviewStatusTab } from '@/components/overview/OverviewStatusTab';
import { OverviewTimeTab } from '@/components/overview/OverviewTimeTab';
import type { DateRange } from '@/components/ruixen/range-calendar';
import { MachineScopePlaceholder } from '@/components/system/MachineScopePlaceholder';
import type { OverviewRange } from '@/components/overview/types';

export function OverviewPage() {
  const [range, setRange] = useState<OverviewRange>('week');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [activeTab, setActiveTab] = useState('time');
  const snapshot = useMemo(() => {
    if (range !== 'custom' || !customRange) return getOverviewSnapshot(range);

    const days = Math.max(
      1,
      Math.ceil((customRange.end.getTime() - customRange.start.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );
    const mappedRange: OverviewRange = days <= 1 ? 'today' : days <= 7 ? 'week' : 'month';
    return getOverviewSnapshot(mappedRange);
  }, [range, customRange]);

  const tabs = [
    { label: 'Time', value: 'time', content: <OverviewTimeTab snapshot={snapshot} /> },
    { label: 'Projects', value: 'projects', content: <OverviewProjectsTab snapshot={snapshot} /> },
    { label: 'Languages', value: 'languages', content: <OverviewLanguagesTab snapshot={snapshot} /> },
    { label: 'Sessions', value: 'sessions', content: <OverviewSessionsTab snapshot={snapshot} /> },
    { label: 'Status', value: 'status', content: <OverviewStatusTab snapshot={snapshot} /> },
  ];

  return (
    <div className="space-y-4">
      <section className="flex items-center justify-between rounded-[18px] bg-[#e5e8e4] p-4">
        <h1 className="text-2xl font-semibold text-[#1d2428]">Overview</h1>
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

      <section className="rounded-[18px] bg-[#ecefee] p-4">
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
