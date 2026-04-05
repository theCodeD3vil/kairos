import type { SessionRecord } from '@/data/mockAnalytics';
import { formatMinutes } from '@/components/analytics/AnalyticsCards';
import { AnimatedTable, type ColumnDef } from '@/components/ui/animated-table';

type AnalyticsSessionsProps = {
  sessions: Array<SessionRecord & { dayLabel: string }>;
};

export function AnalyticsSessionsTable({ sessions }: AnalyticsSessionsProps) {
  const columns: ColumnDef<SessionRecord & { dayLabel: string }>[] = [
    { id: 'day', header: 'Day', cell: (row) => row.dayLabel, width: '100px' },
    { id: 'project', header: 'Project', cell: (row) => row.project },
    { id: 'language', header: 'Language', cell: (row) => row.language },
    { id: 'machine', header: 'Machine', cell: (row) => row.machine },
    {
      id: 'start',
      header: 'Start',
      cell: (row) => new Date(row.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }),
      width: '90px',
    },
    {
      id: 'duration',
      header: 'Duration',
      cell: (row) => formatMinutes(row.durationMinutes),
      width: '90px',
    },
  ];

  return (
    <AnimatedTable
      data={sessions}
      columns={columns}
      striped
      stickyHeader
      emptyMessage="No sessions for this filter."
      className="rounded-[14px] border border-[var(--surface-subtle)] bg-[var(--surface-muted)] shadow-[var(--shadow-inset-soft)]"
    />
  );
}
