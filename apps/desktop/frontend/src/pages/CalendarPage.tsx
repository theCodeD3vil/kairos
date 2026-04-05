import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarMonthGrid } from '@/components/calendar/CalendarMonthGrid';
import { DaySummary } from '@/components/calendar/DaySummary';
import { DaySessions } from '@/components/calendar/DaySessions';
import { DayProjects } from '@/components/calendar/DayProjects';
import { DayMachines } from '@/components/calendar/DayMachines';
import { getMonthActivity, getDayDetail, type CalendarDay } from '@/data/mockCalendar';

function addMonths(base: Date, delta: number) {
  const next = new Date(base);
  next.setMonth(base.getMonth() + delta);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function leadingEmptyDays(date: Date) {
  return startOfMonth(date).getDay();
}

function formatMonthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

function findInitialSelection(monthDays: CalendarDay[], fallbackDate: string) {
  const active = monthDays.find((day) => day.hadActivity);
  return active?.date ?? fallbackDate;
}

export function CalendarPage() {
  const [monthRef, setMonthRef] = useState(() => startOfMonth(new Date('2026-04-05T00:00:00')));
  const [selectedDate, setSelectedDate] = useState<string>(() => '2026-04-05');

  const monthData = useMemo(() => getMonthActivity(monthRef.getFullYear(), monthRef.getMonth()), [monthRef]);
  const monthLabel = formatMonthLabel(monthRef);
  const leading = leadingEmptyDays(monthRef);

  const dayDetail = getDayDetail(selectedDate);
  const selectedIsInMonth = monthData.some((day) => day.date === selectedDate);

  useEffect(() => {
    if (!selectedIsInMonth && monthData.length > 0) {
      const nextSelection = findInitialSelection(monthData, monthData[0].date);
      setSelectedDate(nextSelection);
    }
  }, [selectedIsInMonth, monthData]);

  const handlePrevMonth = () => setMonthRef((prev) => addMonths(prev, -1));
  const handleNextMonth = () => setMonthRef((prev) => addMonths(prev, 1));
  const handleToday = () => {
    const today = startOfMonth(new Date('2026-04-05T00:00:00'));
    setMonthRef(today);
    const todaysDate = '2026-04-05';
    setSelectedDate(todaysDate);
  };

  return (
    <div className="space-y-3">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-[var(--surface-strong)] p-3">
        <h1 className="text-2xl font-semibold text-[var(--ink-strong)]">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="rounded-full! border-black/10" onClick={handlePrevMonth}>
            Prev
          </Button>
          <Button variant="secondary" size="sm" className="rounded-full!" onClick={handleToday}>
            This Month
          </Button>
          <Button variant="outline" size="sm" className="rounded-full! border-black/10" onClick={handleNextMonth}>
            Next
          </Button>
        </div>
      </section>

      <section className="rounded-[16px] bg-[var(--surface)] p-3">
        <CalendarMonthGrid
          monthLabel={monthLabel}
          days={monthData}
          onSelect={setSelectedDate}
          selectedDate={selectedDate}
          leadingEmpty={leading}
        />
      </section>

      <section className="rounded-[16px] bg-[var(--surface)] p-3 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
          {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </h2>
        {dayDetail ? (
          <>
            <DaySummary detail={dayDetail} />
            <div className="grid gap-3 lg:grid-cols-2">
              <DayProjects detail={dayDetail} />
              <DayMachines detail={dayDetail} />
            </div>
            <DaySessions detail={dayDetail} />
          </>
        ) : (
          <div className="rounded-[14px] bg-[var(--surface-muted)] p-4 text-[var(--ink-tertiary)]">
            No coding activity recorded for this day. Select another day with activity.
          </div>
        )}
      </section>
    </div>
  );
}
