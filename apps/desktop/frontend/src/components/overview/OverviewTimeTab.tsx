import { AreaChart, Tracker } from '@lobehub/charts';
import { overviewChartPalette } from '@/components/overview/chart-colors';
import {
  AverageSessionBarsIllustration,
  CodingOrbitIllustration,
  SessionsTimelineIllustration,
  WeeklyMomentumIllustration,
} from '@/components/illustrations/KairosStatIllustrations';
import type { OverviewSnapshot } from '@/components/overview/types';
import { StatusBadge, type StatusBadgeStatus } from '@/components/ui/status-badge';

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
    <article className="rounded-xl bg-[#e6e6e6] p-3 ">
      <h3 className="text-sm font-medium text-[#566568]">{title}</h3>
      <p className="font-numeric mt-1 text-2xl font-semibold text-[#1d2428]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#6d7a7d]">{hint}</p> : null}
    </article>
  );
}

function CodingTimeTodayCard({ value }: { value: string }) {
  return (
    <article className="rounded-xl bg-[#f2f5f4] p-3 ">
      <div className="flex items-center gap-3">
        <div className="aspect-square hidden lg:inline-flex h-16 lg:w-24 shrink-0 rounded-lg bg-[#e7edeb] p-2">
          <CodingOrbitIllustration />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-[#566568]">Today</h3>
          <p className="font-numeric mt-1 text-2xl font-semibold text-[#1d2428]">{value}</p>
        </div>
      </div>
    </article>
  );
}

function CodingTimeWeekCard({ value }: { value: string }) {
  return (
    <article className="rounded-xl bg-[#f2f5f4] p-3 ">
      <div className="flex items-center gap-3">
        <div className="aspect-square hidden lg:inline-flex h-16 lg:w-24 shrink-0 rounded-lg bg-[#e7edeb] p-2">
          <WeeklyMomentumIllustration />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-[#566568]">This Week</h3>
          <p className="font-numeric mt-1 text-2xl font-semibold text-[#1d2428]">{value}</p>
        </div>
      </div>
    </article>
  );
}

function SessionsCard({ value }: { value: string }) {
  return (
    <article className="rounded-xl bg-[#f2f5f4] p-3 ">
      <div className="flex items-center gap-3">
        <div className="aspect-square hidden lg:inline-flex h-16 lg:w-24 shrink-0 rounded-lg bg-[#e7edeb] p-2">
          <SessionsTimelineIllustration />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-[#566568]">Sessions</h3>
          <p className="font-numeric mt-1 text-2xl font-semibold text-[#1d2428]">{value}</p>
        </div>
      </div>
    </article>
  );
}

function AvgSessionCard({ value }: { value: string }) {
  return (
    <article className="rounded-xl bg-[#f2f5f4] p-3 ">
      <div className="flex items-center gap-3">
        <div className="aspect-square hidden lg:inline-flex h-16 lg:w-24 shrink-0 rounded-lg bg-[#e7edeb] p-2">
          <AverageSessionBarsIllustration />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-[#566568]">Avg Session</h3>
          <p className="font-numeric mt-1 text-2xl font-semibold text-[#1d2428]">{value}</p>
        </div>
      </div>
    </article>
  );
}

export function OverviewTimeTab({ snapshot }: OverviewTimeTabProps) {
  const syncStatus: StatusBadgeStatus =
    snapshot.syncHealth.status === 'Healthy'
      ? 'healthy'
      : snapshot.syncHealth.status === 'Degraded'
        ? 'degraded'
        : 'offline';

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
        <article className="rounded-xl bg-[#f2f5f4] p-3">
          <h3 className="text-sm font-medium text-[#566568]">{trendTitleByRange[snapshot.range]}</h3>
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

        <article className="rounded-xl bg-[#f2f5f4] p-3">
          <h3 className="text-sm font-medium text-[#566568]">Work Pattern</h3>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <Metric title="Coding Days" value={String(snapshot.codingDaysThisWeek)} />
            <Metric title="Most Active Hours" value={snapshot.activeHoursSummary} />
            <Metric title="Last Active" value={snapshot.lastActiveAt} />
            <Metric title="Last Updated" value={snapshot.lastUpdatedAt} />
          </div>
        </article>
      </div>

      <article className="rounded-xl bg-[#f2f5f4] p-3">
        <h3 className="text-sm font-medium text-[#566568]">Current Machine</h3>
        <div className="mt-2 grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-[#e8edeb] px-3 py-2">
            <p className="text-xs text-[#607073]">Machine Name</p>
            <p className="mt-1 text-sm font-medium text-[#1d2428]">{snapshot.currentMachine.machineName}</p>
          </div>
          <div className="rounded-lg bg-[#e8edeb] px-3 py-2">
            <p className="text-xs text-[#607073]">Operating System</p>
            <p className="mt-1 text-sm font-medium text-[#1d2428]">
              {snapshot.currentMachine.os} {snapshot.currentMachine.osVersion}
            </p>
          </div>
          <div className="rounded-lg bg-[#e8edeb] px-3 py-2">
            <p className="text-xs text-[#607073]">Editor</p>
            <p className="mt-1 text-sm font-medium text-[#1d2428]">
              {snapshot.currentMachine.editorName} {snapshot.currentMachine.editorVersion}
            </p>
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
            <p className="text-xs text-[#607073]">Last Seen</p>
            <p className="font-numeric mt-1 text-sm font-medium text-[#1d2428]">{snapshot.currentMachine.lastSeenAt}</p>
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
