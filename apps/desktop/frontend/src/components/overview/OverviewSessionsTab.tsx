import type { OverviewSnapshot } from '@/components/overview/types';

type OverviewSessionsTabProps = {
  snapshot: OverviewSnapshot;
};

function SessionMetric({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-xl bg-[#f2f5f4] p-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
      <h3 className="text-sm font-medium text-[#566568]">{title}</h3>
      <p className="font-numeric mt-1 text-2xl font-semibold text-[#1d2428]">{value}</p>
    </article>
  );
}

export function OverviewSessionsTab({ snapshot }: OverviewSessionsTabProps) {
  const latestSession = snapshot.recentSessions[0];

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
        <article className="rounded-xl bg-[#f2f5f4] p-3">
          <h3 className="text-sm font-medium text-[#566568]">Recent Sessions</h3>
          <div className="mt-2 space-y-2">
            {snapshot.recentSessions.length > 0 ? (
              snapshot.recentSessions.map((session) => (
                <div key={`${session.project}-${session.startAt}`} className="rounded-lg bg-[#e8edeb] px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#1d2428]">{session.project}</span>
                    <span className="font-numeric text-sm text-[#4a5d60]">{formatMinutes(session.durationMinutes)}</span>
                  </div>
                  <p className="font-numeric text-xs text-[#5c6d70]">{session.startAt}</p>
                </div>
              ))
            ) : (
              <div className="rounded-lg bg-[#e8edeb] px-3 py-2 text-sm text-[#5c6d70]">No recent sessions.</div>
            )}
          </div>
        </article>

        <article className="rounded-xl bg-[#f2f5f4] p-3">
          <h3 className="text-sm font-medium text-[#566568]">Latest Session</h3>
          <p className="font-numeric mt-2 text-lg font-semibold text-[#1d2428]">
            {latestSession ? `${latestSession.project} · ${formatMinutes(latestSession.durationMinutes)}` : 'No recent activity'}
          </p>
          <div className="mt-4 space-y-2 rounded-lg bg-[#e8edeb] px-3 py-2 text-sm">
            <p className="text-[#1d2428]">
              Most Recently Active Project: <span className="font-medium">{latestSession?.project ?? 'N/A'}</span>
            </p>
            <p className="text-[#1d2428]">
              Most Active Hours: <span className="font-medium font-numeric">{snapshot.activeHoursSummary}</span>
            </p>
            <p className="text-[#1d2428]">
              Last Active: <span className="font-medium font-numeric">{snapshot.lastActiveAt}</span>
            </p>
          </div>
        </article>
      </div>
    </div>
  );
}
