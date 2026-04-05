import { BarChart, DonutChart } from '@lobehub/charts';
import { overviewChartPalette } from '@/components/overview/chart-colors';
import type { OverviewSnapshot } from '@/components/overview/types';

type OverviewProjectsTabProps = {
  snapshot: OverviewSnapshot;
};

const chartColors = [...overviewChartPalette];
const machinePieColors = [...overviewChartPalette];

export function OverviewProjectsTab({ snapshot }: OverviewProjectsTabProps) {
  if (snapshot.topProjects.length === 0) {
    return (
      <div className="rounded-xl bg-[#f2f5f4] p-3 text-sm text-[#5c6d70]">
        No project activity in this range.
      </div>
    );
  }

  const totalMinutes = snapshot.topProjects.reduce((sum, project) => sum + project.minutes, 0);
  const topProject = snapshot.topProjects[0];

  function formatMinutes(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-xl bg-[#f2f5f4] p-3 lg:col-span-2">
          <h3 className="text-sm font-medium text-[#566568]">Time Spent per Project</h3>
          <div className="mt-2 h-64">
            <BarChart
              data={snapshot.topProjects}
              index="project"
              categories={['minutes']}
              colors={chartColors}
              height={256}
              showAnimation
              animationDuration={1000}
              rotateLabelX={{ angle: -20, xAxisHeight: 60 }}
              showLegend={false}
              showGridLines
              valueFormatter={(value) => formatMinutes(Number(value))}
              yAxisWidth={44}
            />
          </div>
        </article>

        <article className="rounded-xl bg-[#f2f5f4] p-3">
          <h3 className="text-sm font-medium text-[#566568]">Machine Time Distribution</h3>
          <div className="mt-2 h-48">
            <DonutChart
              data={snapshot.machineDistribution}
              index="machineName"
              category="share"
              colors={machinePieColors}
              showAnimation
              animationDuration={900}
              showLabel={false}
              style={{ height: 192 }}
              valueFormatter={(value) => `${value}%`}
            />
          </div>
          <div className="mt-2 space-y-2">
            {snapshot.machineDistribution.map((machine) => (
              <div key={machine.machineName} className="flex items-center justify-between rounded-lg bg-[#e8edeb] px-2 py-1.5">
                <span className="text-xs font-medium text-[#1d2428]">{machine.machineName}</span>
                <span className="font-numeric text-xs text-[#4a5d60]">{formatMinutes(machine.minutes)}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="rounded-xl bg-[#f2f5f4] p-3">
        <h3 className="text-sm font-medium text-[#566568]">Most Active Project</h3>
        <p className="mt-2 text-lg font-semibold text-[#1d2428]">{topProject.project}</p>
        <p className="font-numeric mt-1 text-sm text-[#566568]">{formatMinutes(topProject.minutes)} in selected range</p>
        <p className="mt-3 text-sm text-[#566568]">Recent Project Activity</p>
        <p className="font-numeric mt-1 font-medium text-[#1d2428]">{topProject.recentActivityAt}</p>
      </article>

      <article className="rounded-xl bg-[#f2f5f4] p-3">
        <h3 className="text-sm font-medium text-[#566568]">Top Active Projects</h3>
        <div className="mt-2 overflow-hidden rounded-lg border border-[#d3dbd8]">
          <table className="w-full text-sm">
            <thead className="bg-[#e8edeb] text-left text-[#4b5d60]">
              <tr>
                <th className="px-3 py-2">Project</th>
                <th className="px-3 py-2">Time Spent per Project</th>
                <th className="px-3 py-2">Share</th>
                <th className="px-3 py-2">Recent Project Activity</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.topProjects.map((project) => (
                <tr key={project.project} className="border-t border-[#d7dfdc] text-[#1d2428]">
                  <td className="px-3 py-2">{project.project}</td>
                  <td className="font-numeric px-3 py-2">{formatMinutes(project.minutes)}</td>
                  <td className="font-numeric px-3 py-2">{Math.round((project.minutes / totalMinutes) * 100)}%</td>
                  <td className="font-numeric px-3 py-2">{project.recentActivityAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </div>
  );
}
