import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { projectActivityBreakdown, weeklyTrend } from '@/data/mockDashboard';

export function ActivityPage() {
  const maxMinutes = Math.max(...weeklyTrend.map((day) => day.minutes));

  return (
    <div className="space-y-6">
      <SectionCard title="Trend" description="Daily coding output and momentum over the last seven days.">
        <div className="space-y-3">
          {weeklyTrend.map((day) => (
            <div key={day.day} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span>{day.day}</span>
                <span className="text-muted-foreground">{day.minutes} min</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${(day.minutes / maxMinutes) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <Tabs defaultValue="breakdown">
        <TabsList>
          <TabsTrigger value="breakdown">Day Breakdown</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>
        <TabsContent value="breakdown" className="mt-4">
          <SectionCard title="Activity Breakdown" description="Approximate split of coding, review, and meetings.">
            <div className="space-y-3">
              {projectActivityBreakdown.map((day) => (
                <div key={day.day} className="grid grid-cols-[80px_1fr_1fr_1fr] items-center gap-3 text-sm">
                  <span className="text-muted-foreground">{day.day}</span>
                  <span className="rounded bg-primary/15 px-2 py-1">Coding {day.coding}m</span>
                  <span className="rounded bg-secondary px-2 py-1">Review {day.review}m</span>
                  <span className="rounded bg-muted px-2 py-1">Meetings {day.meetings}m</span>
                </div>
              ))}
            </div>
          </SectionCard>
        </TabsContent>
        <TabsContent value="insights" className="mt-4">
          <div className="grid grid-cols-3 gap-4">
            <SectionCard title="Best Window" description="Highest sustained focus block.">
              <p className="text-2xl font-semibold">10:00 - 12:30</p>
              <p className="mt-2 text-sm text-muted-foreground">Average focus score 89 with fewer context switches.</p>
            </SectionCard>
            <SectionCard title="Interruption Profile" description="Frequent interruption interval.">
              <p className="text-2xl font-semibold">~34 min</p>
              <p className="mt-2 text-sm text-muted-foreground">Mostly task pivots between frontend and docs.</p>
            </SectionCard>
            <SectionCard title="Momentum Note" description="Behavioral insight placeholder.">
              <p className="text-sm text-muted-foreground">
                Longest productive streak occurred on Thursday with 3 deep sessions and only 2 high-cost context shifts.
              </p>
            </SectionCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
