import type { CalendarDayDetail } from '@/data/mockCalendar';
import { formatDurationMinutes } from '@/lib/time-format';

export function DayMachines({ detail }: { detail: CalendarDayDetail }) {
  return (
    <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
      <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Machines</h3>
      <div className="mt-3 space-y-2">
        {detail.machines.length === 0 ? (
          <p className="text-sm text-[var(--ink-tertiary)]">No machine activity recorded.</p>
        ) : (
          detail.machines.map((machine) => (
            <div key={machine.name} className="flex items-center justify-between rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
              <div>
                <p className="text-sm font-medium text-[var(--ink-strong)]">{machine.name}</p>
                <p className="text-xs text-[var(--ink-tertiary)]">{machine.os}</p>
              </div>
              <p className="font-numeric text-xs text-[var(--ink-secondary)]">{formatDurationMinutes(machine.minutes, 'short')}</p>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
