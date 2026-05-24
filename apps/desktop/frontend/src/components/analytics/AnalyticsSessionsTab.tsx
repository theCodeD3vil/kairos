import { KairosBarChart } from '@/components/charts/kairos-charts';
import {
  AnalyticsKpiCard,
  AnalyticsMachineList,
  formatMinutes,
} from '@/components/analytics/AnalyticsCards';
import { AnalyticsSessionsTable } from '@/components/analytics/AnalyticsSessions';
import { overviewChartPalette } from '@/components/overview/chart-colors';
import type { AnalyticsSnapshot, RecentSessionRow } from '@/data/mockAnalytics';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';

interface AnalyticsSessionsTabProps {
  snapshot: AnalyticsSnapshot;
  onSessionSelect: (session: RecentSessionRow) => void;
}

export function AnalyticsSessionsTab({
  snapshot,
  onSessionSelect,
}: AnalyticsSessionsTabProps) {
  const eventsInSessions = snapshot.eventKpis.eventsInSessions;
  const trackEditEvents = snapshot.eventKpis.trackEditEvents;
  const trackSaveEvents = snapshot.eventKpis.trackSaveEvents;

  return (
    <div className="space-y-6">
      {/* Sessions */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
          Sessions
        </h2>
        <div className="grid gap-3 md:grid-cols-5">
          <AnalyticsKpiCard
            label="Total sessions"
            value={`${snapshot.sessions.totalSessions}`}
          />
          <AnalyticsKpiCard
            label="Average session"
            value={formatMinutes(snapshot.sessions.averageSessionMinutes)}
          />
          <AnalyticsKpiCard
            label="Median session"
            value={formatMinutes(snapshot.sessionKpis.duration.medianMinutes)}
          />
          <AnalyticsKpiCard
            label="P90 session"
            value={formatMinutes(snapshot.sessionKpis.duration.p90Minutes)}
          />
          <AnalyticsKpiCard
            label="Longest session"
            value={formatMinutes(snapshot.sessions.longestSession)}
          />
        </div>
        <AnalyticsSessionsTable
          sessions={snapshot.sessions.recent}
          onRowSelect={onSessionSelect}
        />
      </section>

      {/* Activity rhythm */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
          Activity rhythm
        </h2>
        {eventsInSessions === 0 ? (
          <div className="rounded-[14px] bg-[var(--surface-muted)] p-4 text-[var(--ink-tertiary)]">
            {trackEditEvents || trackSaveEvents
              ? 'No matched events for this range yet.'
              : 'Enable edit or save tracking in Settings → Tracking to populate this section.'}
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-4">
              <AnalyticsKpiCard
                label="Event density"
                value={`${snapshot.eventKpis.eventDensityPerMinute}/min`}
                hint={`${snapshot.eventKpis.eventsInSessions} events in sessions`}
              />
              <AnalyticsKpiCard
                label="Active share"
                value={`${snapshot.eventKpis.activeShare}%`}
                hint={`${snapshot.eventKpis.activeEventCount} edits + saves`}
              />
              <AnalyticsKpiCard
                label="Edit / save ratio"
                value={
                  snapshot.eventKpis.saveCount === 0
                    ? '—'
                    : `${snapshot.eventKpis.editSaveRatio}`
                }
                hint={`${snapshot.eventKpis.editCount} edits · ${snapshot.eventKpis.saveCount} saves`}
              />
              <AnalyticsKpiCard
                label="Heartbeat-only sessions"
                value={`${snapshot.eventKpis.heartbeatOnlySessionCount}`}
                hint={`${snapshot.eventKpis.heartbeatOnlySessionShare}%`}
              />
            </div>
            <div className="grid gap-3 md:grid-cols-4">
              <AnalyticsKpiCard
                label="Warm-up median"
                value={
                  snapshot.eventKpis.warmupQualifyingSessionCount === 0
                    ? '—'
                    : `${snapshot.eventKpis.medianSessionWarmupSeconds}s`
                }
                hint={`${snapshot.eventKpis.warmupQualifyingSessionCount} qualifying sessions`}
              />
              <AnalyticsKpiCard
                label="Edit → save median"
                value={
                  snapshot.eventKpis.medianEditToSaveSeconds === 0
                    ? '—'
                    : `${snapshot.eventKpis.medianEditToSaveSeconds}s`
                }
              />
              <AnalyticsKpiCard
                label="Return after idle"
                value={
                  snapshot.eventKpis.medianReturnAfterIdleMinutes === 0
                    ? '—'
                    : `${snapshot.eventKpis.medianReturnAfterIdleMinutes}m`
                }
                hint="median across same-day gaps"
              />
              <AnalyticsKpiCard
                label="Activity bursts"
                value={`${snapshot.eventKpis.activityBurstCount}`}
                hint="≥5 active events in 5min"
              />
            </div>
            {snapshot.eventKpis.eventTypeMixByProject.length > 0 && (
              <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
                <h3 className="text-sm font-semibold text-[var(--ink-strong)]">
                  Event type mix by project
                </h3>
                <div className="mt-2 h-64">
                  <KairosBarChart
                    data={snapshot.eventKpis.eventTypeMixByProject.map(
                      (p) => ({
                        label: p.name,
                        edits: p.editCount,
                        saves: p.saveCount,
                        opens: p.openCount,
                        heartbeats: p.heartbeatCount,
                      })
                    )}
                    index="label"
                    categories={[
                      'edits',
                      'saves',
                      'opens',
                      'heartbeats',
                    ]}
                    colors={[
                      overviewChartPalette[0],
                      overviewChartPalette[1],
                      overviewChartPalette[2],
                      overviewChartPalette[3],
                    ]}
                    rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                    valueFormatter={(value) => `${value}`}
                    tooltipValueFormatter={(value) => `${value} events`}
                    seriesLabels={{
                      edits: 'Edits',
                      saves: 'Saves',
                      opens: 'Opens',
                      heartbeats: 'Heartbeats',
                    }}
                    height={240}
                  />
                </div>
              </article>
            )}
          </>
        )}
      </section>

      {/* Machines */}
      {SHOW_MULTI_MACHINE_UI && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
            Machines
          </h2>
          <AnalyticsMachineList items={snapshot.machines.items} />
        </section>
      )}
    </div>
  );
}
