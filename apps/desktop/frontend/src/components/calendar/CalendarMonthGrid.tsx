import { cn } from '@/lib/utils';
import type { CalendarDay } from '@/data/mockCalendar';

type CalendarMonthGridProps = {
  monthLabel: string;
  days: CalendarDay[];
  onSelect: (date: string) => void;
  selectedDate: string;
  leadingEmpty: number;
};

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function CalendarMonthGrid({ monthLabel, days, onSelect, selectedDate, leadingEmpty }: CalendarMonthGridProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">{monthLabel}</h2>
      </div>
      <div className="grid grid-cols-7 gap-1 text-xs text-[var(--ink-tertiary)]">
        {weekDays.map((day) => (
          <div key={day} className="text-center">
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: leadingEmpty }).map((_, index) => (
          <div key={`empty-${index}`} className="rounded-lg bg-transparent" />
        ))}
        {days.map((day) => {
          const active = day.hadActivity;
          const selected = day.date === selectedDate;
          return (
            <button
              key={day.date}
              type="button"
              onClick={() => onSelect(day.date)}
              className={cn(
                'group relative flex h-16 flex-col items-start rounded-lg border border-transparent px-2 py-1 text-left transition-all',
                selected ? 'border-[var(--ink-accent)] bg-[var(--surface-muted)] shadow-[var(--shadow-inset-soft)]' : 'bg-[var(--surface-subtle)] hover:border-[var(--surface-pill)]',
              )}
            >
              <span className="text-sm font-semibold text-[var(--ink-strong)]">{Number(day.date.slice(-2))}</span>
              {active ? (
                <div className="mt-auto w-full rounded-md bg-[var(--surface-pill)] px-2 py-1 text-[10px] text-[var(--ink-secondary)]">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--ink-strong)]">{formatMinutes(day.totalMinutes)}</span>
                    <span>{day.sessionCount} sess</span>
                  </div>
                  <p className="truncate text-[10px] text-[var(--ink-tertiary)]">{day.topProject}</p>
                </div>
              ) : (
                <span className="mt-auto text-[10px] text-[var(--ink-tertiary)]">No activity</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
