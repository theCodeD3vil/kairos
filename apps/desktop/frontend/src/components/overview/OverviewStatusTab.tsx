import { Tracker } from '@lobehub/charts';
import type { OverviewSnapshot } from '@/components/overview/types';

type OverviewStatusTabProps = {
  snapshot: OverviewSnapshot;
};

function BoolPill({ value }: { value: boolean }) {
  return (
    <span className={`rounded-full px-2 py-1 text-xs font-medium ${value ? 'bg-[#d7ebdd] text-[#2f6d45]' : 'bg-[#f1dbdf] text-[#8d4f64]'}`}>
      {value ? 'enabled' : 'disabled'}
    </span>
  );
}

export function OverviewStatusTab({ snapshot }: OverviewStatusTabProps) {
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
            <div className="mt-1"><BoolPill value={snapshot.localOnlyMode} /></div>
          </div>
          <div className="rounded-lg bg-[#e8edeb] px-3 py-2">
            <p className="text-xs text-[#607073]">Tracking Status</p>
            <div className="mt-1"><BoolPill value={snapshot.trackingEnabled} /></div>
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
            blockHeight={24}
            blockWidth="100%"
            blockGap={6}
            leftLabel={snapshot.syncHealth.status}
            rightLabel={`Last sync ${snapshot.syncHealth.lastSyncAt}`}
          />
        </div>
      </article>
    </div>
  );
}
