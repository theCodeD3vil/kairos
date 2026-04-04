import { useMemo, useState } from 'react';
import { VercelTabs } from '@/components/ui/vercel-tabs';
import { OverviewLanguagesTab } from '@/components/overview/OverviewLanguagesTab';
import { getOverviewSnapshot } from '@/components/overview/mock-data';
import { OverviewProjectsTab } from '@/components/overview/OverviewProjectsTab';
import { OverviewRangeSelector } from '@/components/overview/OverviewRangeSelector';
import { OverviewSessionsTab } from '@/components/overview/OverviewSessionsTab';
import { OverviewStatusTab } from '@/components/overview/OverviewStatusTab';
import { OverviewTimeTab } from '@/components/overview/OverviewTimeTab';
import type { OverviewRange } from '@/components/overview/types';

export function OverviewPage() {
  const [range, setRange] = useState<OverviewRange>('week');
  const [activeTab, setActiveTab] = useState('time');
  const snapshot = useMemo(() => getOverviewSnapshot(range), [range]);

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
        <OverviewRangeSelector value={range} onChange={setRange} />
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
