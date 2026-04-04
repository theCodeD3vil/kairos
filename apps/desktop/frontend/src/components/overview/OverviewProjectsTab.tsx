import { BarChart } from '@lobehub/charts';
import type { OverviewSnapshot } from '@/components/overview/types';

type OverviewProjectsTabProps = {
  snapshot: OverviewSnapshot;
};

const chartColors = ['#b9c95a', '#aaba4f', '#9baa45', '#8d9b3d', '#7f8b35'];

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
              rotateLabelX={{ angle: -20, xAxisHeight: 60 }}
              showLegend={false}
              showGridLines
              valueFormatter={(value) => formatMinutes(Number(value))}
              yAxisWidth={44}
            />
          </div>
        </article>

        <article className="rounded-xl bg-[#f2f5f4] p-3">
          <h3 className="text-sm font-medium text-[#566568]">Most Active Project</h3>
          <p className="mt-2 text-lg font-semibold text-[#1d2428]">{topProject.project}</p>
          <p className="font-numeric mt-1 text-sm text-[#566568]">{formatMinutes(topProject.minutes)} in selected range</p>
          <p className="mt-6 text-sm text-[#566568]">Recent Project Activity</p>
          <p className="font-numeric mt-1 font-medium text-[#1d2428]">{topProject.recentActivityAt}</p>
        </article>
      </div>

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
