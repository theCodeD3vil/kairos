import { KairosAreaChart } from '@/components/charts/kairos-charts';
import { overviewChartPalette } from '@/components/overview/chart-colors';
import type { OverviewSnapshot } from '@/components/overview/types';

type OverviewSessionsTabProps = {
  snapshot: OverviewSnapshot;
};

function SessionMetric({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-xl bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
      <h3 className="text-sm font-medium text-[var(--ink-secondary)]">{title}</h3>
      <p className="font-numeric mt-1 text-2xl font-semibold text-[var(--ink-strong)]">{value}</p>
    </article>
  );
}

export function OverviewSessionsTab({ snapshot }: OverviewSessionsTabProps) {
  const latestSession = snapshot.recentSessions[0];
  const sessionDurationTrend = [...snapshot.recentSessions]
    .reverse()
    .map((session) => ({
      label: session.startAt,
      value: Number((session.durationMinutes / 60).toFixed(2)),
    }));

  function formatMinutes(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SessionMetric title="Sessions" value={String(snapshot.sessionCount)} />
        <SessionMetric title="Avg Session" value={formatMinutes(snapshot.averageSessionMinutes)} />
        <SessionMetric title="Coding Days" value={String(snapshot.codingDaysThisWeek)} />
        <SessionMetric title="Last Active" value={snapshot.lastActiveAt} />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <article className="rounded-xl bg-[var(--surface-muted)] p-3">
          <h3 className="text-sm font-medium text-[var(--ink-secondary)]">Recent Sessions</h3>
          <div className="mt-2 space-y-2">
            {snapshot.recentSessions.length > 0 ? (
              snapshot.recentSessions.map((session) => (
                <div key={`${session.project}-${session.startAt}`} className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[var(--ink-strong)]">{session.project}</span>
                    <span className="font-numeric text-sm text-[var(--ink-label)]">{formatMinutes(session.durationMinutes)}</span>
                  </div>
                  <p className="font-numeric text-xs text-[var(--ink-tertiary)]">{session.startAt}</p>
                  <p className="mt-1 text-xs text-[var(--ink-tertiary)]">
                    {session.machineName} · {session.osLabel}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--ink-tertiary)]">No recent sessions.</div>
            )}
          </div>
        </article>

        <article className="rounded-xl bg-[var(--surface-muted)] p-3">
          <h3 className="text-sm font-medium text-[var(--ink-secondary)]">Session Durations Over Time</h3>
          <div className="mt-2 h-52">
            <KairosAreaChart
              data={sessionDurationTrend}
              index="label"
              categories={['value']}
              colors={[overviewChartPalette[2]]}
              height={208}
              showLegend={false}
              showGridLines
              valueFormatter={(value) => `${Number(value).toFixed(1)}h`}
              yAxisWidth={44}
            />
          </div>
          <div className="mt-3 rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
            <p className="font-numeric text-sm font-semibold text-[var(--ink-strong)]">
              {latestSession ? `${latestSession.project} · ${formatMinutes(latestSession.durationMinutes)}` : 'No recent activity'}
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
