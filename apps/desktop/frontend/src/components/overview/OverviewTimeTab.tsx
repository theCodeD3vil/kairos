import { AreaChart, Tracker } from '@lobehub/charts';
import { overviewChartPalette, syncUptimeColors } from '@/components/overview/chart-colors';
import {
  AverageSessionBarsIllustration,
  CodingOrbitIllustration,
  SessionsTimelineIllustration,
  WeeklyMomentumIllustration,
} from '@/components/illustrations/KairosStatIllustrations';
import type { OverviewSnapshot } from '@/components/overview/types';
import { StatusBadge, type StatusBadgeStatus } from '@/components/ui/status-badge';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';

type OverviewTimeTabProps = {
  snapshot: OverviewSnapshot;
};

const areaChartColors = [...overviewChartPalette];

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function Metric({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <article className="rounded-xl bg-[var(--surface-subtle)] p-3 ">
      <h3 className="text-sm font-medium text-[var(--ink-secondary)]">{title}</h3>
      <p className="font-numeric mt-1 text-2xl font-semibold text-[var(--ink-strong)]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--ink-soft)]">{hint}</p> : null}
    </article>
  );
}

function CodingTimeTodayCard({ value }: { value: string }) {
  return (
    <article className="rounded-xl bg-[var(--surface-muted)] p-3 ">
      <div className="flex items-center gap-3">
        <div className="aspect-square hidden lg:inline-flex h-16 lg:w-24 shrink-0 rounded-lg bg-[var(--surface-contrast)] p-2">
          <CodingOrbitIllustration />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-[var(--ink-secondary)]">Today</h3>
          <p className="font-numeric mt-1 text-2xl font-semibold text-[var(--ink-strong)]">{value}</p>
        </div>
      </div>
    </article>
  );
}

function CodingTimeWeekCard({ value }: { value: string }) {
  return (
    <article className="rounded-xl bg-[var(--surface-muted)] p-3 ">
      <div className="flex items-center gap-3">
        <div className="aspect-square hidden lg:inline-flex h-16 lg:w-24 shrink-0 rounded-lg bg-[var(--surface-contrast)] p-2">
          <WeeklyMomentumIllustration />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-[var(--ink-secondary)]">This Week</h3>
          <p className="font-numeric mt-1 text-2xl font-semibold text-[var(--ink-strong)]">{value}</p>
        </div>
      </div>
    </article>
  );
}

function SessionsCard({ value }: { value: string }) {
  return (
    <article className="rounded-xl bg-[var(--surface-muted)] p-3 ">
      <div className="flex items-center gap-3">
        <div className="aspect-square hidden lg:inline-flex h-16 lg:w-24 shrink-0 rounded-lg bg-[var(--surface-contrast)] p-2">
          <SessionsTimelineIllustration />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-[var(--ink-secondary)]">Sessions</h3>
          <p className="font-numeric mt-1 text-2xl font-semibold text-[var(--ink-strong)]">{value}</p>
        </div>
      </div>
    </article>
  );
}

function AvgSessionCard({ value }: { value: string }) {
  return (
    <article className="rounded-xl bg-[var(--surface-muted)] p-3 ">
      <div className="flex items-center gap-3">
        <div className="aspect-square hidden lg:inline-flex h-16 lg:w-24 shrink-0 rounded-lg bg-[var(--surface-contrast)] p-2">
          <AverageSessionBarsIllustration />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-[var(--ink-secondary)]">Avg Session</h3>
          <p className="font-numeric mt-1 text-2xl font-semibold text-[var(--ink-strong)]">{value}</p>
        </div>
      </div>
    </article>
  );
}

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

export function OverviewTimeTab({ snapshot }: OverviewTimeTabProps) {
  const syncStatus: StatusBadgeStatus =
    snapshot.syncHealth.status === 'Healthy'
      ? 'healthy'
      : snapshot.syncHealth.status === 'Degraded'
        ? 'degraded'
        : 'offline';
  const hasTrackedActivity = snapshot.todayMinutes > 0 || snapshot.weekMinutes > 0 || snapshot.sessionCount > 0;

  const trendTitleByRange: Record<OverviewSnapshot['range'], string> = {
    today: 'Today Trend',
    week: 'Weekly Trend',
    month: 'Monthly Trend',
    custom: 'Custom Trend',
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <CodingTimeTodayCard value={formatMinutes(snapshot.todayMinutes)} />
        <CodingTimeWeekCard value={formatMinutes(snapshot.weekMinutes)} />
        <SessionsCard value={String(snapshot.sessionCount)} />
        <AvgSessionCard value={formatMinutes(snapshot.averageSessionMinutes)} />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <article className="rounded-xl bg-[var(--surface-muted)] p-3">
          <h3 className="text-sm font-medium text-[var(--ink-secondary)]">{trendTitleByRange[snapshot.range]}</h3>
          <div className="mt-2 h-52">
            <AreaChart
              data={snapshot.weeklyTrend}
              index="label"
              categories={['value']}
              colors={areaChartColors}
              height={208}
              showAnimation
              animationDuration={900}
              showLegend={false}
              showGridLines
              valueFormatter={(value) => `${Number(value).toFixed(1)}h`}
              yAxisWidth={44}
            />
          </div>
        </article>

        <article className="rounded-xl bg-[var(--surface-muted)] p-3">
          <h3 className="text-sm font-medium text-[var(--ink-secondary)]">Work Pattern</h3>
          <div className="mt-2 grid gap-3 md:grid-cols-4 lg:grid-cols-2">
            <Metric title="Coding Days" value={hasTrackedActivity ? String(snapshot.codingDaysThisWeek) : '-'} />
            <Metric title="Most Active Hours" value={hasTrackedActivity ? snapshot.activeHoursSummary : '-'} />
            <Metric title="Last Active" value={hasTrackedActivity ? snapshot.lastActiveAt : '-'} />
            <Metric title="Last Updated" value={hasTrackedActivity ? snapshot.lastUpdatedAt : '-'} />
          </div>
        </article>
      </div>

      {SHOW_MULTI_MACHINE_UI ? (
        <article className="rounded-xl bg-[var(--surface-muted)] p-3">
          <h3 className="text-sm font-medium text-[var(--ink-secondary)]">Current Machine</h3>
          <div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-6">
            <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
              <p className="text-xs text-[var(--ink-muted)]">Machine Name</p>
              <p className="mt-1 line-clamp-1 text-sm font-medium text-[var(--ink-strong)]">{snapshot.currentMachine.machineName}</p>
            </div>
            <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
              <p className="text-xs text-[var(--ink-muted)]">Operating System</p>
              <p className="mt-1 line-clamp-1 text-sm font-medium text-[var(--ink-strong)]">
                {snapshot.currentMachine.os} {snapshot.currentMachine.osVersion}
              </p>
            </div>
            <div className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
              <p className="text-xs text-[var(--ink-muted)]">Editor</p>
              <p className="mt-1 line-clamp-1 text-sm font-medium text-[var(--ink-strong)]">
                {snapshot.currentMachine.editorName} {snapshot.currentMachine.editorVersion}
              </p>
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
              <p className="text-xs text-[var(--ink-muted)]">Last Seen</p>
              <p className="font-numeric mt-1 line-clamp-1 text-sm font-medium text-[var(--ink-strong)]">{snapshot.currentMachine.lastSeenAt}</p>
            </div>
          </div>
        </article>
      ) : null}

      <article className="rounded-xl bg-[var(--surface-muted)] p-3">
        <h3 className="text-sm font-medium text-[var(--ink-secondary)]">VS Code Sync Health</h3>
        <div className="mt-3 rounded-lg bg-[var(--surface-subtle)] p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge status={syncStatus} />
            <p className="font-numeric text-xs text-[var(--ink-tertiary)]">Last sync {snapshot.syncHealth.lastSyncAt}</p>
          </div>
          <div className="mt-3 overflow-x-auto">
            <div className="min-w-[340px]">
              <Tracker
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
