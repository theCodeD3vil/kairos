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
  const codeEventCount =
    snapshot.eventKpis.editCount + snapshot.eventKpis.saveCount + snapshot.eventKpis.openCount;
  const trackEditEvents = snapshot.eventKpis.trackEditEvents;
  const trackSaveEvents = snapshot.eventKpis.trackSaveEvents;
  const trackFileOpenEvents = snapshot.eventKpis.trackFileOpenEvents;
  const hasCodeEventMix = snapshot.eventKpis.eventTypeMixByProject.some(
    (project) => project.editCount > 0 || project.saveCount > 0 || project.openCount > 0,
  );

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

      {/* Tracked events */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">
          Tracked events
        </h2>
        {codeEventCount === 0 ? (
          <div className="rounded-[14px] bg-[var(--surface-muted)] p-4 text-[var(--ink-tertiary)]">
            {trackEditEvents || trackSaveEvents || trackFileOpenEvents
              ? 'No edit, save, or file-open events matched this range yet.'
              : 'Enable edit, save, or file-open tracking in Settings → Tracking to populate this section.'}
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-5">
              <AnalyticsKpiCard
                label="Matched events"
                value={`${codeEventCount}`}
                hint="Edits, saves, and file opens"
              />
              <AnalyticsKpiCard
                label="Edits"
                value={`${snapshot.eventKpis.editCount}`}
              />
              <AnalyticsKpiCard
                label="Saves"
                value={`${snapshot.eventKpis.saveCount}`}
              />
              <AnalyticsKpiCard
                label="File opens"
                value={`${snapshot.eventKpis.openCount}`}
              />
              <AnalyticsKpiCard
                label="Edits per save"
                value={
                  snapshot.eventKpis.saveCount === 0
                    ? '—'
                    : `${snapshot.eventKpis.editSaveRatio}`
                }
                hint={`${snapshot.eventKpis.editCount} edits · ${snapshot.eventKpis.saveCount} saves`}
              />
            </div>
            {hasCodeEventMix && (
              <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
                <h3 className="text-sm font-semibold text-[var(--ink-strong)]">
                  Events by project
                </h3>
                <div className="mt-2 h-64">
                  <KairosBarChart
                    data={snapshot.eventKpis.eventTypeMixByProject.map(
                      (p) => ({
                        label: p.name,
                        edits: p.editCount,
                        saves: p.saveCount,
                        opens: p.openCount,
                      })
                    )}
                    index="label"
                    categories={[
                      'edits',
                      'saves',
                      'opens',
                    ]}
                    colors={[
                      overviewChartPalette[0],
                      overviewChartPalette[1],
                      overviewChartPalette[2],
                    ]}
                    rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                    valueFormatter={(value) => `${value}`}
                    tooltipValueFormatter={(value) => `${value} events`}
                    seriesLabels={{
                      edits: 'Edits',
                      saves: 'Saves',
                      opens: 'File opens',
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
