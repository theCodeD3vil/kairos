import { AnimatedTable, type ColumnDef } from '@/components/ui/animated-table';
import type { CalendarDayDetail } from '@/data/mockCalendar';
import { LanguageIcon } from '@/lib/languageIcons';

function formatMinutes(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function DaySessions({ detail }: { detail: CalendarDayDetail }) {
  const columns: ColumnDef<(typeof detail.sessions)[number]>[] = [
    { id: 'start', header: 'Start', accessorKey: 'start', width: '90px' },
    { id: 'duration', header: 'Duration', cell: (row) => formatMinutes(row.durationMinutes), width: '100px' },
    { id: 'project', header: 'Project', accessorKey: 'project' },
    { id: 'machine', header: 'Machine', accessorKey: 'machine' },
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

  return (
    <AnimatedTable
      data={detail.sessions}
      columns={columns}
      striped
      stickyHeader
      emptyMessage="No sessions recorded for this date."
      className="rounded-[14px] border border-[var(--surface-subtle)] bg-[var(--surface-muted)] shadow-[var(--shadow-inset-soft)]"
    />
  );
}
