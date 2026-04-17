import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { CalendarMonthGrid } from '@/components/calendar/CalendarMonthGrid';
import { DaySummary } from '@/components/calendar/DaySummary';
import { DaySessions } from '@/components/calendar/DaySessions';
import { DayProjects } from '@/components/calendar/DayProjects';
import { DayMachines } from '@/components/calendar/DayMachines';
import { LiveRefreshIndicator } from '@/components/system/LiveRefreshIndicator';
import type { CalendarDay, CalendarDayDetail } from '@/data/mockCalendar';
import { Skeleton } from '@/components/ui/skeleton';
import { desktopResourceKeys } from '@/app/DesktopDataContext';
import { loadCalendarDay, loadCalendarMonth } from '@/lib/backend/page-data';
import { emptySettingsScreenData, loadSettingsScreenData } from '@/lib/backend/settings';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';
import { useDesktopResource } from '@/lib/hooks/useDesktopResource';
import { readCalendarMonthPreference, saveCalendarMonthPreference } from '@/lib/settings/preferences';

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
  const monthTouchedRef = useRef(false);
  const [monthRef, setMonthRef] = useState(() => startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const { data: settingsData, hasResolvedOnce: hasResolvedSettings } = useDesktopResource({
    cacheKey: desktopResourceKeys.settings(),
    emptyValue: emptySettingsScreenData(),
    errorMessage: 'Unable to load desktop settings.',
    load: (options) => loadSettingsScreenData(options),
  });
  const {
    data: monthView,
    isInitialLoading: isMonthLoading,
    loadError: monthLoadError,
    refreshPulseKey,
  } = useDesktopResource<{ monthLabel: string; days: CalendarDay[] }>({
    cacheKey: desktopResourceKeys.calendarMonth(monthRef.getFullYear(), monthRef.getMonth()),
    emptyValue: { monthLabel: formatMonthLabel(monthRef), days: [] },
    errorMessage: 'Unable to load calendar data from the desktop backend.',
    load: (options) => loadCalendarMonth(monthRef.getFullYear(), monthRef.getMonth(), options),
  });
  const {
    data: dayDetail,
    isInitialLoading: isDayLoading,
    loadError: dayLoadError,
  } = useDesktopResource<CalendarDayDetail | null>({
    cacheKey: desktopResourceKeys.calendarDay(selectedDate),
    emptyValue: null,
    errorMessage: 'Unable to load selected day activity.',
    load: (options) => loadCalendarDay(selectedDate, options),
  });

  const monthData = monthView.days;
  const monthLabel = monthView.monthLabel;
  const loadError = monthLoadError ?? dayLoadError;
  const leading = leadingEmptyDays(monthRef);
  const selectedIsInMonth = monthData.some((day) => day.date === selectedDate);

  useEffect(() => {
    if (!hasResolvedSettings || monthTouchedRef.current) {
      return;
    }

    if (settingsData.viewModel.appBehavior.reopenLastViewedContext) {
      const savedMonth = readCalendarMonthPreference();
      if (savedMonth) {
        monthTouchedRef.current = true;
        setMonthRef(savedMonth);
        return;
      }
    }

    monthTouchedRef.current = true;
  }, [hasResolvedSettings, settingsData.viewModel.appBehavior.reopenLastViewedContext]);

  useEffect(() => {
    if (!monthTouchedRef.current) {
      return;
    }
    saveCalendarMonthPreference(monthRef);
  }, [monthRef]);

  useEffect(() => {
    if (!selectedIsInMonth && monthData.length > 0) {
      const nextSelection = findInitialSelection(monthData, monthData[0].date);
      setSelectedDate(nextSelection);
    }
  }, [selectedIsInMonth, monthData]);

  const handlePrevMonth = () => {
    monthTouchedRef.current = true;
    setMonthRef((prev) => addMonths(prev, -1));
  };
  const handleNextMonth = () => {
    monthTouchedRef.current = true;
    setMonthRef((prev) => addMonths(prev, 1));
  };
  const handleToday = () => {
    monthTouchedRef.current = true;
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
          <LiveRefreshIndicator pulseKey={refreshPulseKey} />
          <Button variant="outline" size="sm" className="rounded-full! border-[hsl(var(--border)/0.7)]" onClick={handlePrevMonth}>
            Prev
          </Button>
          <Button variant="secondary" size="sm" className="rounded-full!" onClick={handleToday}>
            This Month
          </Button>
          <Button variant="outline" size="sm" className="rounded-full! border-[hsl(var(--border)/0.7)]" onClick={handleNextMonth}>
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
        {isMonthLoading && !loadError ? (
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 35 }, (_, index) => (
              <Skeleton key={`calendar-skeleton-${index + 1}`} className="h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <CalendarMonthGrid
            monthLabel={monthLabel}
            days={monthData}
            onSelect={setSelectedDate}
            selectedDate={selectedDate}
            leadingEmpty={leading}
          />
        )}
      </section>

      <section className="rounded-[16px] bg-[var(--surface)] p-3 space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
          {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
        </h2>
        {isDayLoading && !loadError ? (
          <>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <Skeleton className="h-56" />
              <Skeleton className="h-56" />
            </div>
            <Skeleton className="h-72" />
          </>
        ) : dayDetail ? (
          <>
            <DaySummary detail={dayDetail} />
            <div className="grid gap-3 lg:grid-cols-2">
              <DayProjects detail={dayDetail} />
              {SHOW_MULTI_MACHINE_UI ? <DayMachines detail={dayDetail} /> : null}
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
