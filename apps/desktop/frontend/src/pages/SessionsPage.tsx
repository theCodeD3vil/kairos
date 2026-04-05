import { getOverviewSnapshot } from '@/components/overview/mock-data';
import { MachineScopePlaceholder } from '@/components/system/MachineScopePlaceholder';

export function SessionsPage() {
  const snapshot = getOverviewSnapshot('week');

  function formatMinutes(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  }

  return (
    <div className="space-y-4">
      <section className="flex items-center justify-between rounded-[18px] bg-[#e5e8e4] p-4">
        <h1 className="text-2xl font-semibold text-[#1d2428]">Sessions</h1>
        <MachineScopePlaceholder
          machines={snapshot.knownMachines}
          currentMachineName={snapshot.currentMachine.machineName}
        />
      </section>

      <section className="rounded-[18px] bg-[#ecefee] p-4">
        <h2 className="text-lg font-semibold text-[#1d2428]">Recent Sessions</h2>
        <div className="mt-3 space-y-2">
          {snapshot.recentSessions.map((session) => (
            <article
              key={`${session.project}-${session.startAt}-${session.machineName}`}
              className="rounded-xl bg-[#f2f5f4] p-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-[#1d2428]">{session.project}</p>
                <p className="font-numeric text-sm text-[#4a5d60]">{formatMinutes(session.durationMinutes)}</p>
              </div>
              <p className="font-numeric mt-1 text-xs text-[#5c6d70]">{session.startAt}</p>
              <p className="mt-1 text-xs text-[#5c6d70]">
                {session.machineName} · {session.osLabel}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[18px] bg-[#ecefee] p-4">
        <h2 className="text-lg font-semibold text-[#1d2428]">Last Active</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <article className="rounded-xl bg-[#f2f5f4] p-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
            <p className="text-xs text-[#607073]">Last Active Machine</p>
            <p className="mt-1 text-sm font-medium text-[#1d2428]">{snapshot.lastActiveMachine}</p>
          </article>
          <article className="rounded-xl bg-[#f2f5f4] p-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
            <p className="text-xs text-[#607073]">Last Active Time</p>
            <p className="font-numeric mt-1 text-sm font-medium text-[#1d2428]">{snapshot.lastActiveAt}</p>
          </article>
        </div>
      </section>
    </div>
  );
}
