import { Activity, ArrowRightLeft, Clock3, Timer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { StatCard } from '@/components/dashboard/StatCard';
import {
  dashboardStats,
  hourlyPattern,
  recentSessions,
  topLanguages,
  topProjects,
  weeklyTrend,
} from '@/data/mockDashboard';

export function OverviewPage() {
  const maxTrend = Math.max(...weeklyTrend.map((item) => item.minutes));
  const maxHour = Math.max(...hourlyPattern);

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-4 gap-4">
        <StatCard
          label="Today"
          value={`${dashboardStats.todayMinutes}m`}
          detail="+14m from yesterday"
          icon={<Clock3 className="size-4" />}
          tone="accent"
        />
        <StatCard
          label="This Week"
          value={`${dashboardStats.weekMinutes}m`}
          detail="Steady week-over-week growth"
          icon={<Activity className="size-4" />}
        />
        <StatCard
          label="Focus Time"
          value={`${dashboardStats.focusHours}h`}
          detail="Deep work sessions tracked"
          icon={<Timer className="size-4" />}
        />
        <StatCard
          label="Context Switches"
          value={`${dashboardStats.contextSwitches}`}
          detail="Lower than last week"
          icon={<ArrowRightLeft className="size-4" />}
        />
      </section>

      <section className="grid grid-cols-3 gap-4">
        <SectionCard
          title="Weekly Coding Trend"
          description="Mock trend based on local captured editor activity."
          contentClassName="space-y-4"
        >
          <div className="grid h-44 grid-cols-7 items-end gap-3 rounded-lg border border-border/70 bg-muted/20 p-4">
            {weeklyTrend.map((item) => (
              <div key={item.day} className="flex flex-col items-center gap-2">
                <div
                  className="w-full rounded bg-primary/70"
                  style={{ height: `${Math.max(12, (item.minutes / maxTrend) * 120)}px` }}
                />
                <span className="text-xs text-muted-foreground">{item.day}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Peak: Thursday</span>
            <span>Average session focus: 84%</span>
          </div>
        </SectionCard>

        <SectionCard title="Top Projects" description="Most active projects in the selected range.">
          <div className="space-y-3">
            {topProjects.map((project) => (
              <div key={project.name} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{project.name}</p>
                  <p className="text-xs text-muted-foreground">{project.minutes} minutes</p>
                </div>
                <Badge variant="outline">{project.delta}</Badge>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Top Languages" description="Share of total coding time.">
          <div className="space-y-4">
            {topLanguages.map((language) => (
              <div key={language.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{language.name}</span>
                  <span className="text-muted-foreground">{language.share}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${language.share}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </section>

      <section className="grid grid-cols-3 gap-4">
        <SectionCard title="Recent Sessions" description="Latest local sessions from your machine." contentClassName="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Project</TableHead>
                <TableHead>Start</TableHead>
                <TableHead className="pr-6 text-right">Duration</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentSessions.slice(0, 4).map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="pl-6">{session.project}</TableCell>
                  <TableCell>{session.start}</TableCell>
                  <TableCell className="pr-6 text-right">{session.duration}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </SectionCard>

        <SectionCard title="Active Hours" description="Hourly heatmap placeholder for local activity windows.">
          <div className="grid grid-cols-6 gap-2">
            {hourlyPattern.map((value, idx) => (
              <div
                key={`${value}-${idx}`}
                className="rounded-md border border-border/50 p-2 text-center text-xs text-muted-foreground"
                style={{ backgroundColor: `hsl(var(--primary) / ${Math.max(0.14, value / maxHour)})` }}
              >
                {idx + 8}:00
              </div>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-2 w-full" />
            <Skeleton className="h-2 w-4/5" />
            <Skeleton className="h-2 w-3/5" />
          </div>
        </SectionCard>

        <SectionCard title="Private by Design" description="Kairos keeps your activity data local-first.">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>No external sync, no cloud forwarding, and no hidden telemetry in this shell.</p>
            <Separator />
            <ul className="list-disc space-y-1 pl-5">
              <li>Event capture and storage will stay local-first.</li>
              <li>Workspace exclusions are enforced client-side.</li>
              <li>Future connectors are explicit opt-in.</li>
            </ul>
            <Badge className="mt-2" variant="secondary">
              Local-first mode active
            </Badge>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
