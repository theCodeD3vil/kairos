import { Activity, Bell, Gauge, Languages, Lock, Projects, Search, Sessions, Settings, Sparkles, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

const velocityBars = [
  34, 52, 28, 70, 79, 45, 33, 57, 31, 49, 37, 66, 22, 41,
];

const languageBreakdown = [
  { name: 'TypeScript', value: 42, color: 'bg-blue-400' },
  { name: 'Rust', value: 28, color: 'bg-amber-400' },
  { name: 'Python', value: 19, color: 'bg-violet-400' },
  { name: 'Other', value: 11, color: 'bg-zinc-400' },
];

const feedRows = [
  {
    project: 'kairos-dashboard-ui',
    branch: 'feat/mac-os-sequoia',
    commit: 'Refactored glassmorphism styles',
    state: 'Active',
    duration: '42m 12s',
  },
  {
    project: 'kairos-backend-core',
    branch: 'main',
    commit: 'Optimized telemetry ingestion',
    state: 'Building',
    duration: '13m 49s',
  },
  {
    project: 'internal-auth-service',
    branch: 'fix/oauth-tokens',
    commit: 'Updated security headers',
    state: 'Idle',
    duration: '2h 15m',
  },
];

const deadlines = [
  { title: 'Release v2.5 Candidate', due: 'Apr 5 - 7:25 PM' },
  { title: 'Sprint Planning Meeting', due: 'Monday - 10:00 AM' },
];

const leftNav = [
  { label: 'Overview', icon: Gauge, active: true },
  { label: 'Activity', icon: Activity },
  { label: 'Projects', icon: Projects },
  { label: 'Languages', icon: Languages },
  { label: 'Sessions', icon: Sessions },
];

function MetricCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <Card className="border-zinc-800/90 bg-zinc-900/70">
      <CardHeader className="pb-2">
        <CardTitle className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 pt-0">
        <div className="text-3xl font-semibold text-zinc-50">{value}</div>
        <div className="text-xs text-emerald-400">{detail}</div>
      </CardContent>
    </Card>
  );
}

export function KairosOverviewMacOSProConcept2() {
  return (
    <div className="min-h-screen bg-[#0a0b0f] p-4 text-zinc-100">
      <div className="mx-auto grid max-w-[1800px] grid-cols-[260px_1fr] overflow-hidden rounded-3xl border border-zinc-800/70 bg-zinc-950/80 shadow-2xl shadow-black/40">
        <aside className="relative border-r border-zinc-800/70 bg-gradient-to-b from-zinc-950 via-zinc-950 to-[#07080d] px-4 py-5">
          <div className="mb-6 flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-blue-500/20 ring-1 ring-blue-400/30">
              <Sparkles className="size-4 text-blue-300" />
            </div>
            <div>
              <h1 className="text-sm font-semibold">Kairos</h1>
            </div>
          </div>

          <nav className="space-y-1.5">
            {leftNav.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                  item.active
                    ? 'bg-blue-500/20 text-blue-200 ring-1 ring-blue-400/30'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100'
                }`}
              >
                <item.icon className="size-4" />
                {item.label}
              </button>
            ))}
          </nav>

          <div className="absolute bottom-4 left-4 right-4">
            <Separator className="mb-3 bg-zinc-800/80" />
            <button type="button" className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-200">
              <Settings className="size-3.5" />
              Settings
            </button>
          </div>
        </aside>

        <main className="bg-gradient-to-b from-zinc-950 to-zinc-900/90 p-5">
          <header className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-sm font-medium text-zinc-300">Overview</h2>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-zinc-500" />
                <Input
                  className="h-8 w-56 border-zinc-800 bg-zinc-950/90 pl-7 text-xs"
                  placeholder="Search resources..."
                />
              </div>
              <Button size="icon" variant="outline" className="size-8 border-zinc-800 bg-zinc-950">
                <Bell className="size-3.5" />
              </Button>
              <Button size="icon" variant="outline" className="size-8 border-zinc-800 bg-zinc-950">
                <User className="size-3.5" />
              </Button>
            </div>
          </header>

          <section className="mb-4 grid grid-cols-4 gap-3">
            <MetricCard title="Total Code Time" value="142.5h" detail="+12% this week" />
            <MetricCard title="Commits Made" value="842" detail="Daily avg: 34" />
            <MetricCard title="Active Projects" value="12" detail="3 new this month" />
            <MetricCard title="Success Rate" value="98.2%" detail="No critical regressions" />
          </section>

          <section className="mb-4 grid grid-cols-[2fr_1fr] gap-3">
            <Card className="border-zinc-800/90 bg-zinc-900/70">
              <CardHeader>
                <CardTitle className="text-xs text-zinc-200">Development Velocity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl bg-zinc-950/80 p-4">
                  {/* Replace this fallback with Blitz chart once installed (https://blitz-charts.vercel.app/docs/installation). */}
                  <div className="grid h-52 grid-cols-14 items-end gap-1.5">
                    {velocityBars.map((value, idx) => (
                      <div
                        key={`${value}-${idx}`}
                        className="rounded-sm bg-gradient-to-t from-slate-700 to-slate-500"
                        style={{ height: `${value}%` }}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800/90 bg-zinc-900/70">
              <CardHeader>
                <CardTitle className="text-xs text-zinc-200">Language Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {languageBreakdown.map((item) => (
                  <div key={item.name} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-zinc-300">
                      <span>{item.name}</span>
                      <span>{item.value}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-zinc-800">
                      <div className={`h-1.5 rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </section>

          <section className="mb-4 rounded-2xl border border-zinc-800/90 bg-zinc-900/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-medium text-zinc-200">Live Activity Feed</h3>
              <div className="text-[10px] text-zinc-500">3 online · 4 building</div>
            </div>

            <div className="overflow-hidden rounded-xl border border-zinc-800/80">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/70 text-zinc-400">
                  <tr>
                    <th className="px-3 py-2 font-medium">Project</th>
                    <th className="px-3 py-2 font-medium">Branch</th>
                    <th className="px-3 py-2 font-medium">Last Commit</th>
                    <th className="px-3 py-2 font-medium">State</th>
                    <th className="px-3 py-2 font-medium">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {feedRows.map((row) => (
                    <tr key={row.project} className="border-t border-zinc-800/70 text-zinc-300">
                      <td className="px-3 py-2">{row.project}</td>
                      <td className="px-3 py-2 text-zinc-400">{row.branch}</td>
                      <td className="px-3 py-2 text-zinc-400">{row.commit}</td>
                      <td className="px-3 py-2">
                        <Badge
                          variant="outline"
                          className={`border-zinc-700 text-[10px] ${
                            row.state === 'Active'
                              ? 'text-emerald-300'
                              : row.state === 'Building'
                                ? 'text-blue-300'
                                : 'text-zinc-400'
                          }`}
                        >
                          {row.state}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-zinc-400">{row.duration}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-cols-3 gap-3">
            <Card className="border-zinc-800/90 bg-zinc-900/70">
              <CardHeader>
                <CardTitle className="text-xs text-zinc-200">Upcoming Deadlines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0 text-xs">
                {deadlines.map((item) => (
                  <div key={item.title} className="rounded-lg border border-zinc-800/70 bg-zinc-950/70 p-2.5">
                    <div className="text-zinc-100">{item.title}</div>
                    <div className="text-zinc-500">{item.due}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-zinc-800/90 bg-zinc-900/70">
              <CardHeader>
                <CardTitle className="text-xs text-zinc-200">System Health</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <div className="text-right text-[10px] text-emerald-400">98.6%</div>
                <div className="grid grid-cols-6 gap-1.5">
                  {[74, 76, 80, 82, 86, 93].map((v) => (
                    <div key={v} className="h-9 rounded-sm bg-emerald-500/20">
                      <div className="h-full rounded-sm bg-emerald-400/80" style={{ height: `${v}%` }} />
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-zinc-500">All microservices performing within thresholds.</div>
              </CardContent>
            </Card>

            <Card className="border-zinc-800/90 bg-zinc-900/70">
              <CardHeader>
                <CardTitle className="text-xs text-zinc-200">Recent Contributor</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-xs">
                <div className="flex items-center gap-3 rounded-lg border border-zinc-800/70 bg-zinc-950/70 p-2.5">
                  <div className="grid size-9 place-items-center rounded-full bg-cyan-500/20 text-cyan-300">AR</div>
                  <div>
                    <div className="font-medium text-zinc-100">Alex Rivers</div>
                    <div className="text-zinc-500">Opened 10+ commits today</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-7 border-zinc-700 bg-zinc-950 text-[11px]">
                    View Profile
                  </Button>
                  <Button size="sm" className="h-7 bg-blue-600 text-[11px] hover:bg-blue-500">
                    Message
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="mt-4 flex items-center gap-2 text-[10px] text-zinc-500">
            <Lock className="size-3" />
            Local analytics only. No external telemetry uplink.
          </div>
        </main>
      </div>
    </div>
  );
}
