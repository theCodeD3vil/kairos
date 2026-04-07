import { Tracker } from '@lobehub/charts';
import type { OverviewSnapshot } from '@/components/overview/types';
import { StatusBadge, type StatusBadgeStatus } from '@/components/ui/status-badge';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';

type OverviewStatusTabProps = {
  snapshot: OverviewSnapshot;
};

function SyncHealthLegend() {
  const items = [
    { label: 'Healthy', color: 'bg-emerald-500' },
    { label: 'Degraded', color: 'bg-amber-500' },
    { label: 'Offline', color: 'bg-rose-500' },
  ];

  return (
    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[var(--ink-tertiary)]">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${item.color}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

export function OverviewStatusTab({ snapshot }: OverviewStatusTabProps) {
  const syncStatus: StatusBadgeStatus =
    snapshot.syncHealth.status === 'Healthy'
      ? 'healthy'
      : snapshot.syncHealth.status === 'Degraded'
        ? 'degraded'
        : 'offline';

  return (
    <div className="space-y-4">
      <article className="rounded-xl bg-[var(--surface-muted)] p-3">
        <h3 className="text-sm font-medium text-[var(--ink-secondary)]">System Status</h3>
        <div className="mt-2 grid gap-2 md:grid-cols-4">
          {SHOW_MULTI_MACHINE_UI ? (
            <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
              <p className="text-xs text-[var(--ink-muted)]">Current Machine</p>
              <p className="mt-1 text-sm font-medium text-[var(--ink-strong)]">{snapshot.currentMachine.machineName}</p>
            </div>
          ) : null}
          <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
            <p className="text-xs text-[var(--ink-muted)]">Operating System</p>
            <p className="mt-1 text-sm font-medium text-[var(--ink-strong)]">{snapshot.currentMachine.os}</p>
          </div>
          <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
            <p className="text-xs text-[var(--ink-muted)]">Local Only</p>
            <div className="mt-1">
              <StatusBadge status={snapshot.localOnlyMode ? 'enabled' : 'disabled'} />
            </div>
          </div>
          <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
            <p className="text-xs text-[var(--ink-muted)]">Tracking Status</p>
            <div className="mt-1">
              <StatusBadge status={snapshot.trackingEnabled ? 'enabled' : 'disabled'} />
            </div>
          </div>
          <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
            <p className="text-xs text-[var(--ink-muted)]">Last Updated</p>
            <p className="font-numeric mt-1 text-sm font-medium text-[var(--ink-strong)]">{snapshot.lastUpdatedAt}</p>
          </div>
          <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
            <p className="text-xs text-[var(--ink-muted)]">Last Active</p>
            <p className="font-numeric mt-1 text-sm font-medium text-[var(--ink-strong)]">{snapshot.lastActiveAt}</p>
          </div>
          {SHOW_MULTI_MACHINE_UI ? (
            <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
              <p className="text-xs text-[var(--ink-muted)]">Last Active Machine</p>
              <p className="mt-1 text-sm font-medium text-[var(--ink-strong)]">{snapshot.lastActiveMachine}</p>
            </div>
          ) : null}
        </div>
      </article>

      <article className="rounded-xl bg-[var(--surface-muted)] p-3">
        <h3 className="text-sm font-medium text-[var(--ink-secondary)]">VS Code Sync Health</h3>
        <div className="mt-3 rounded-lg bg-[var(--surface-subtle)] p-3">
          <Tracker
            data={snapshot.syncHealth.blocks}
            blockHeight={30}
            blockWidth={8}
            blockGap={4}
            leftLabel={<StatusBadge status={syncStatus} />}
            rightLabel={`Last sync ${snapshot.syncHealth.lastSyncAt}`}
          />
        </div>
        <SyncHealthLegend />
      </article>
    </div>
  );
}
