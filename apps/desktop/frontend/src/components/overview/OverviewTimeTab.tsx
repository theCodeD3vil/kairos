import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  CodingOrbitIllustration,
  WeeklyMomentumIllustration,
} from '@/components/illustrations/KairosStatIllustrations';
import type { OverviewSnapshot } from '@/components/overview/types';

type OverviewTimeTabProps = {
  snapshot: OverviewSnapshot;
};

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function Metric({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <article className="rounded-xl bg-[#f2f5f4] p-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
      <h3 className="text-sm font-medium text-[#566568]">{title}</h3>
      <p className="font-numeric mt-1 text-2xl font-semibold text-[#1d2428]">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#6d7a7d]">{hint}</p> : null}
    </article>
  );
}

function CodingTimeTodayCard({ value }: { value: string }) {
  return (
    <article className="rounded-xl bg-[#f2f5f4] p-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-3">
        <div className="aspect-square w-24 shrink-0 rounded-lg bg-[#e7edeb] p-2">
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
    <article className="rounded-xl bg-[#f2f5f4] p-3 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-3">
        <div className="aspect-square w-24 shrink-0 rounded-lg bg-[#e7edeb] p-2">
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

export function OverviewTimeTab({ snapshot }: OverviewTimeTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CodingTimeTodayCard value={formatMinutes(snapshot.todayMinutes)} />
        <CodingTimeWeekCard value={formatMinutes(snapshot.weekMinutes)} />
        <Metric title="Sessions" value={String(snapshot.sessionCount)} />
        <Metric title="Avg Session" value={formatMinutes(snapshot.averageSessionMinutes)} />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <article className="rounded-xl bg-[#f2f5f4] p-3">
          <h3 className="text-sm font-medium text-[#566568]">Weekly Trend</h3>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={snapshot.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#d3dbd8" />
                <XAxis dataKey="label" tick={{ fill: '#4a5d60', fontSize: 12 }} />
                <YAxis tick={{ fill: '#4a5d60', fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#0f4f58" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
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
    </div>
  );
}
