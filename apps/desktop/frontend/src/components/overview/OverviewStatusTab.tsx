import { KairosTracker } from '@/components/charts/kairos-charts';
import { syncUptimeColors } from '@/components/overview/chart-colors';
import type { OverviewSnapshot } from '@/components/overview/types';
import { StatusBadge, type StatusBadgeStatus } from '@/components/ui/status-badge';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';

type OverviewStatusTabProps = {
  snapshot: OverviewSnapshot;
};

function SyncHealthLegend() {
  const items = [
    { label: 'Healthy', color: syncUptimeColors.high },
    { label: 'Degraded', color: syncUptimeColors.medium },
    { label: 'Offline', color: syncUptimeColors.critical },
  ];

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--ink-tertiary)]">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={syncStatus} />
              <span className="rounded-md border border-[hsl(var(--border)/0.7)] px-2 py-0.5 text-xs text-[var(--ink-secondary)]">
                Bridge {snapshot.syncHealth.bridgeReachable ? 'Reachable' : 'Unreachable'}
              </span>
            </div>
            <p className="font-numeric text-xs text-[var(--ink-tertiary)]">Last sync {snapshot.syncHealth.lastSyncAt}</p>
          </div>
          <div className="mt-3 overflow-x-auto">
            <div className="min-w-[340px]">
              <KairosTracker
                data={snapshot.syncHealth.blocks}
                blockHeight={28}
                blockWidth={16}
                blockGap={6}
              />
            </div>
          </div>
        </div>
        <SyncHealthLegend />
      </article>
    </div>
  );
}
