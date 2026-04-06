import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarMonthGrid } from '@/components/calendar/CalendarMonthGrid';
import { DaySummary } from '@/components/calendar/DaySummary';
import { DaySessions } from '@/components/calendar/DaySessions';
import { DayProjects } from '@/components/calendar/DayProjects';
import { DayMachines } from '@/components/calendar/DayMachines';
import type { CalendarDay, CalendarDayDetail } from '@/data/mockCalendar';
import { loadCalendarDay, loadCalendarMonth } from '@/lib/backend/page-data';

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
  const [monthRef, setMonthRef] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [monthData, setMonthData] = useState<CalendarDay[]>([]);
  const [monthLabel, setMonthLabel] = useState(() => formatMonthLabel(monthRef));
  const [dayDetail, setDayDetail] = useState<CalendarDayDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const leading = leadingEmptyDays(monthRef);
  const selectedIsInMonth = monthData.some((day) => day.date === selectedDate);

  useEffect(() => {
    let cancelled = false;

    loadCalendarMonth(monthRef.getFullYear(), monthRef.getMonth())
      .then((result) => {
        if (!cancelled) {
          setLoadError(null);
          setMonthData(result.days);
          setMonthLabel(result.monthLabel);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('Unable to load calendar data from the desktop backend.');
          setMonthData([]);
          setMonthLabel(formatMonthLabel(monthRef));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [monthRef]);

  useEffect(() => {
    let cancelled = false;

    loadCalendarDay(selectedDate)
      .then((detail) => {
        if (!cancelled) {
          setLoadError(null);
          setDayDetail(detail);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('Unable to load selected day activity.');
          setDayDetail(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  useEffect(() => {
    if (!selectedIsInMonth && monthData.length > 0) {
      const nextSelection = findInitialSelection(monthData, monthData[0].date);
      setSelectedDate(nextSelection);
    }
  }, [selectedIsInMonth, monthData]);

  const handlePrevMonth = () => setMonthRef((prev) => addMonths(prev, -1));
  const handleNextMonth = () => setMonthRef((prev) => addMonths(prev, 1));
  const handleToday = () => {
    const current = new Date();
    const today = startOfMonth(current);
    setMonthRef(today);
    const todaysDate = current.toISOString().slice(0, 10);
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
        {loadError ? (
          <div className="mb-3 rounded-[14px] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--ink-tertiary)]">
            {loadError}
          </div>
        ) : null}
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
