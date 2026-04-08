import type { CalendarDayDetail } from '@/data/mockCalendar';
import { overviewChartPalette } from '@/components/overview/chart-colors';
import { formatDurationMinutes } from '@/lib/time-format';

export function DayProjects({ detail }: { detail: CalendarDayDetail }) {
  return (
    <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
      <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Top projects</h3>
      <div className="mt-3 space-y-2">
        {detail.projectBreakdown.length === 0 ? (
          <p className="text-sm text-[var(--ink-tertiary)]">No projects recorded for this date.</p>
        ) : (
          detail.projectBreakdown.map((project, index) => (
            <div
              key={project.project}
              className="flex items-center gap-3 rounded-lg bg-[var(--surface-subtle)] px-3 py-2"
            >
              <span
                className="inline-block h-3 w-3 rounded-sm border border-[hsl(var(--border)/0.55)]"
                style={{ backgroundColor: overviewChartPalette[index % overviewChartPalette.length] }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[var(--ink-strong)]">{project.project}</p>
                <p className="text-xs text-[var(--ink-tertiary)]">
                  {project.sessionCount} sessions · {formatDurationMinutes(project.minutes, 'short')}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
