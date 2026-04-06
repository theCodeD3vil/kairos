import type { SessionRecord } from '@/data/mockAnalytics';
import { formatMinutes } from '@/components/analytics/AnalyticsCards';
import { AnimatedTable, type ColumnDef } from '@/components/ui/animated-table';
import { LanguageIcon } from '@/lib/languageIcons';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';

type AnalyticsSessionsProps = {
  sessions: Array<SessionRecord & { dayLabel: string }>;
};

export function AnalyticsSessionsTable({ sessions }: AnalyticsSessionsProps) {
  const columns: ColumnDef<SessionRecord & { dayLabel: string }>[] = [
    { id: 'day', header: 'Day', cell: (row) => row.dayLabel, width: '100px' },
    { id: 'project', header: 'Project', cell: (row) => row.project },
    {
      id: 'language',
      header: 'Language',
      cell: (row) =>
        row.language ? (
          <span className="inline-flex items-center gap-1.5">
            <LanguageIcon language={row.language} size={16} />
            {row.language}
          </span>
        ) : (
          '—'
        ),
    },
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

  const visibleColumns = SHOW_MULTI_MACHINE_UI
    ? columns
    : columns.filter((column) => column.id !== 'machine');

  return (
    <AnimatedTable
      data={sessions}
      columns={visibleColumns}
      striped
      stickyHeader
      emptyMessage="No sessions for this filter."
      className="rounded-[14px] border border-[var(--surface-subtle)] bg-[var(--surface-muted)] shadow-[var(--shadow-inset-soft)]"
    />
  );
}
