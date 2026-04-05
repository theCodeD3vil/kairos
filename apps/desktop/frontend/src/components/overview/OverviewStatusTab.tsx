import { Tracker } from '@lobehub/charts';
import type { OverviewSnapshot } from '@/components/overview/types';
import { StatusBadge, type StatusBadgeStatus } from '@/components/ui/status-badge';

type OverviewStatusTabProps = {
  snapshot: OverviewSnapshot;
};

export function OverviewStatusTab({ snapshot }: OverviewStatusTabProps) {
  const syncStatus: StatusBadgeStatus =
    snapshot.syncHealth.status === 'Healthy'
      ? 'healthy'
      : snapshot.syncHealth.status === 'Degraded'
        ? 'degraded'
        : 'offline';

  return (
    <div className="space-y-4">
      <article className="rounded-xl bg-[#f2f5f4] p-3">
        <h3 className="text-sm font-medium text-[#566568]">System Status</h3>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <div className="rounded-lg bg-[#e8edeb] px-3 py-2">
            <p className="text-xs text-[#607073]">Current Machine</p>
            <p className="mt-1 text-sm font-medium text-[#1d2428]">{snapshot.currentMachine.machineName}</p>
          </div>
          <div className="rounded-lg bg-[#e8edeb] px-3 py-2">
            <p className="text-xs text-[#607073]">Operating System</p>
            <p className="mt-1 text-sm font-medium text-[#1d2428]">{snapshot.currentMachine.os}</p>
          </div>
          <div className="rounded-lg bg-[#e8edeb] px-3 py-2">
            <p className="text-xs text-[#607073]">Local Only</p>
            <div className="mt-1">
              <StatusBadge status={snapshot.localOnlyMode ? 'enabled' : 'disabled'} />
            </div>
          </div>
          <div className="rounded-lg bg-[#e8edeb] px-3 py-2">
            <p className="text-xs text-[#607073]">Tracking Status</p>
            <div className="mt-1">
              <StatusBadge status={snapshot.trackingEnabled ? 'enabled' : 'disabled'} />
            </div>
          </div>
          <div className="rounded-lg bg-[#e8edeb] px-3 py-2">
            <p className="text-xs text-[#607073]">Last Updated</p>
            <p className="font-numeric mt-1 text-sm font-medium text-[#1d2428]">{snapshot.lastUpdatedAt}</p>
          </div>
          <div className="rounded-lg bg-[#e8edeb] px-3 py-2">
            <p className="text-xs text-[#607073]">Last Active</p>
            <p className="font-numeric mt-1 text-sm font-medium text-[#1d2428]">{snapshot.lastActiveAt}</p>
          </div>
          <div className="rounded-lg bg-[#e8edeb] px-3 py-2">
            <p className="text-xs text-[#607073]">Last Active Machine</p>
            <p className="mt-1 text-sm font-medium text-[#1d2428]">{snapshot.lastActiveMachine}</p>
          </div>
        </div>
      </article>

      <article className="rounded-xl bg-[#f2f5f4] p-3">
        <h3 className="text-sm font-medium text-[#566568]">VS Code Sync Health</h3>
        <div className="mt-3 rounded-lg bg-[#e8edeb] p-3">
          <Tracker
            data={snapshot.syncHealth.blocks}
            blockHeight={30}
            blockWidth={8}
            blockGap={4}
            leftLabel={<StatusBadge status={syncStatus} />}
            rightLabel={`Last sync ${snapshot.syncHealth.lastSyncAt}`}
          />
        </div>
      </article>
    </div>
  );
}
