import { AnimatedTable, type ColumnDef } from '@/components/ui/animated-table';
import type { CalendarDayDetail } from '@/data/mockCalendar';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';
import { LanguageIcon } from '@/lib/languageIcons';
import { formatDurationMinutes } from '@/lib/time-format';

export function DaySessions({ detail }: { detail: CalendarDayDetail }) {
  const columns: ColumnDef<(typeof detail.sessions)[number]>[] = [
    { id: 'start', header: 'Start', accessorKey: 'start', width: '90px' },
    { id: 'duration', header: 'Duration', cell: (row) => formatDurationMinutes(row.durationMinutes, 'short'), width: '100px' },
    { id: 'project', header: 'Project', accessorKey: 'project' },
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
      hideable: true,
    },
  ];

  const visibleColumns = SHOW_MULTI_MACHINE_UI
    ? columns
    : columns.filter((column) => column.id !== 'machine');

  return (
    <AnimatedTable
      data={detail.sessions}
      columns={visibleColumns}
      striped
      stickyHeader
      emptyMessage="No sessions recorded for this date."
      className="rounded-[14px] border border-[var(--surface-subtle)] bg-[var(--surface-muted)] shadow-[var(--shadow-inset-soft)]"
    />
  );
}
