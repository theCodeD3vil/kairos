import { AreaChart, BarChart, DonutChart } from '@lobehub/charts';
import { overviewChartPalette } from '@/components/overview/chart-colors';
import type { OverviewSnapshot } from '@/components/overview/types';
import { AnimatedTable, type ColumnDef } from '@/components/ui/animated-table';

type OverviewProjectsTabProps = {
  snapshot: OverviewSnapshot;
};

const chartColors = [...overviewChartPalette];
const machinePieColors = [...overviewChartPalette];

type ProjectTableRow = {
  id: string;
  project: string;
  minutes: number;
  share: string;
  recentActivityAt: string;
};

export function OverviewProjectsTab({ snapshot }: OverviewProjectsTabProps) {
  if (snapshot.topProjects.length === 0) {
    return (
      <div className="rounded-xl bg-[var(--surface-muted)] p-3 text-sm text-[var(--ink-tertiary)]">
        No project activity in this range.
      </div>
    );
  }

  const totalMinutes = snapshot.topProjects.reduce((sum, project) => sum + project.minutes, 0);
  const topProject = snapshot.topProjects[0];
  const trendProjects = snapshot.topProjects.slice(0, 5);
  const trendCategories = trendProjects.map((project) => project.project);
  const trendColors = trendProjects.map((project) => project.color);
  const projectTrendData = snapshot.weeklyTrend.map((point, index) => {
    const projectedTotalsInHours = point.value;
    const row: Record<string, number | string> = { label: point.label };

    trendProjects.forEach((project, projectIndex) => {
      const share = project.minutes / totalMinutes;
      const wave = 0.9 + (((index + projectIndex) % 3) * 0.08);
      row[project.project] = Number((projectedTotalsInHours * share * wave).toFixed(2));
    });

    return row;
  });
  const projectRows: ProjectTableRow[] = snapshot.topProjects.map((project) => ({
    id: project.project,
    project: project.project,
    minutes: project.minutes,
    share: `${Math.round((project.minutes / totalMinutes) * 100)}%`,
    recentActivityAt: project.recentActivityAt,
  }));

  function formatMinutes(minutes: number) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  }

  const projectColumns: ColumnDef<ProjectTableRow>[] = [
    {
      id: 'project',
      header: 'Project',
      accessorKey: 'project',
    },
    {
      id: 'minutes',
      header: 'Time Spent per Project',
      cell: (row) => <span className="font-numeric">{formatMinutes(row.minutes)}</span>,
      align: 'right',
    },
    {
      id: 'share',
      header: 'Share',
      accessorKey: 'share',
      align: 'right',
    },
    {
      id: 'recentActivityAt',
      header: 'Recent Project Activity',
      accessorKey: 'recentActivityAt',
      align: 'right',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-3">
        <article className="rounded-xl bg-[var(--surface-muted)] p-3 lg:col-span-2">
          <h3 className="text-sm font-medium text-[var(--ink-secondary)]">Time Spent per Project</h3>
          <div className="mt-2 h-56">
            <BarChart
              data={snapshot.topProjects}
              index="project"
              categories={['minutes']}
              colors={chartColors}
              height={224}
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

        <article className="rounded-xl bg-[var(--surface-muted)] p-3">
          <h3 className="text-sm font-medium text-[var(--ink-secondary)]">Machine Time Distribution</h3>
          <div className="mt-2 h-44">
            <DonutChart
              data={snapshot.machineDistribution}
              index="machineName"
              category="share"
              colors={machinePieColors}
              showAnimation
              animationDuration={900}
              showLabel={false}
              style={{ height: 176 }}
              valueFormatter={(value) => `${value}%`}
            />
          </div>
          <div className="mt-2 space-y-2">
            {snapshot.machineDistribution.map((machine) => (
              <div key={machine.machineName} className="flex items-center justify-between rounded-lg bg-[var(--surface-subtle)] px-2 py-1.5">
                <span className="text-xs font-medium text-[var(--ink-strong)]">{machine.machineName}</span>
                <span className="font-numeric text-xs text-[var(--ink-label)]">{formatMinutes(machine.minutes)}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      <article className="rounded-xl bg-[var(--surface-muted)] p-3">
        <h3 className="text-sm font-medium text-[var(--ink-secondary)]">Most Active Project</h3>
        <p className="mt-2 text-lg font-semibold text-[var(--ink-strong)]">{topProject.project}</p>
        <p className="font-numeric mt-1 text-sm text-[var(--ink-secondary)]">{formatMinutes(topProject.minutes)} in selected range</p>
        <p className="mt-3 text-sm text-[var(--ink-secondary)]">Recent Project Activity</p>
        <p className="font-numeric mt-1 font-medium text-[var(--ink-strong)]">{topProject.recentActivityAt}</p>
      </article>

      <article className="rounded-xl bg-[var(--surface-muted)] p-3">
        <h3 className="text-sm font-medium text-[var(--ink-secondary)]">Project Activity Over Time</h3>
        <div className="mt-2 h-52">
          <AreaChart
            data={projectTrendData}
            index="label"
            categories={trendCategories}
            colors={trendColors}
            stack={false}
            showGradient={false}
            height={208}
            showAnimation
            animationDuration={1000}
            showLegend
            showGridLines
            valueFormatter={(value) => `${Number(value).toFixed(1)}h`}
            yAxisWidth={44}
          />
        </div>
      </article>

      <article className="rounded-xl bg-[var(--surface-muted)] p-3">
        <h3 className="text-sm font-medium text-[var(--ink-secondary)]">Top Active Projects</h3>
        <div className="mt-2">
          <AnimatedTable
            data={projectRows}
            columns={projectColumns}
            striped
            stickyHeader
            className="bg-[var(--surface-quiet)]"
          />
        </div>
      </article>
    </div>
  );
}
