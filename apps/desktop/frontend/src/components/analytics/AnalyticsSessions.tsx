import type { RecentSessionRow } from '@/data/mockAnalytics';
import { formatMinutes } from '@/components/analytics/AnalyticsCards';
import { AnimatedTable, type ColumnDef } from '@/components/ui/animated-table';
import { LanguageIcon } from '@/lib/languageIcons';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';

type AnalyticsSessionsProps = {
  sessions: RecentSessionRow[];
  onRowSelect?: (session: RecentSessionRow) => void;
};

export function AnalyticsSessionsTable({ sessions, onRowSelect }: AnalyticsSessionsProps) {
  const columns: ColumnDef<RecentSessionRow>[] = [
    { id: 'day', header: 'Day', cell: (row) => row.dayLabel, width: '100px' },
    { id: 'project', header: 'Project', cell: (row) => row.project },
    {
      id: 'language',
      header: 'Language',
      cell: (row) =>
        row.language && !row.language.startsWith('Mixed') ? (
          <span className="inline-flex items-center gap-1.5">
            <LanguageIcon language={row.language} size={16} />
            {row.language}
          </span>
        ) : row.language ? (
          row.language
        ) : (
          '—'
        ),
    },
    {
      id: 'sessions',
      header: 'Sessions',
      cell: (row) => row.sessionCount,
      width: '80px',
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
    {
      id: 'machine',
      header: 'Machine',
      cell: (row) => row.machine,
      width: '120px',
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
      onRowClick={onRowSelect}
      emptyMessage="No sessions for this filter."
      className="rounded-[14px] border border-[var(--surface-subtle)] bg-[var(--surface-muted)] shadow-[var(--shadow-inset-soft)]"
    />
  );
}
