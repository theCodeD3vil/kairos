import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { OverviewSnapshot } from '@/components/overview/types';

type OverviewProjectsTabProps = {
  snapshot: OverviewSnapshot;
};

const barColors = ['#0f4f58', '#365db8', '#58a073', '#95b665', '#c4d56b'];

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
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={snapshot.topProjects}>
                <XAxis dataKey="project" tick={{ fill: '#4a5d60', fontSize: 12 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fill: '#4a5d60', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="minutes" radius={[8, 8, 0, 0]}>
                  {snapshot.topProjects.map((project, index) => (
                    <Cell key={project.project} fill={barColors[index % barColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
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
