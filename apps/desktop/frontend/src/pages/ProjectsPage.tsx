import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { topProjects } from '@/data/mockDashboard';

export function ProjectsPage() {
  return (
    <div className="space-y-6">
      <SectionCard title="Projects" description="Project time totals and trend placeholders." contentClassName="px-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Project</TableHead>
              <TableHead>Total Time</TableHead>
              <TableHead>Daily Avg</TableHead>
              <TableHead>Trend</TableHead>
              <TableHead className="pr-6 text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topProjects.map((project, idx) => (
              <TableRow key={project.name}>
                <TableCell className="pl-6 font-medium">{project.name}</TableCell>
                <TableCell>{project.minutes} min</TableCell>
                <TableCell>{Math.round(project.minutes / 7)} min/day</TableCell>
                <TableCell>{project.delta}</TableCell>
                <TableCell className="pr-6 text-right">
                  <Badge variant={idx < 2 ? 'secondary' : 'outline'}>{idx < 2 ? 'Active' : 'Steady'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>
      <div className="grid grid-cols-2 gap-4">
        <SectionCard title="Trend Placeholder" description="Weekly trajectory preview by project.">
          <div className="h-44 rounded-lg border border-dashed border-border/70 bg-muted/15" />
        </SectionCard>
        <SectionCard title="Allocation Placeholder" description="Projected distribution and drift over time.">
          <div className="h-44 rounded-lg border border-dashed border-border/70 bg-muted/15" />
        </SectionCard>
      </div>
    </div>
  );
}
