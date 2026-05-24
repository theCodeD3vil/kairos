import { KairosBarChart } from '@/components/charts/kairos-charts';
import {
  AnalyticsKpiCard,
  formatMinutes,
} from '@/components/analytics/AnalyticsCards';
import { overviewChartPalette } from '@/components/overview/chart-colors';
import type { AnalyticsSnapshot } from '@/data/mockAnalytics';
import { formatDurationMinutes } from '@/lib/time-format';

interface AnalyticsFilesTabProps {
  snapshot: AnalyticsSnapshot;
}

export function AnalyticsFilesTab({ snapshot }: AnalyticsFilesTabProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Files</h2>

      {!snapshot.fileKpis.optInEnabled ? (
        <div className="rounded-[14px] bg-[var(--surface-muted)] p-4 text-[var(--ink-tertiary)]">
          Enable file metrics in Settings → Privacy to populate this section.
        </div>
      ) : !snapshot.fileKpis.filePathsAvailable ? (
        <div className="rounded-[14px] bg-[var(--surface-muted)] p-4 text-[var(--ink-tertiary)]">
          File path mode is set to Hidden. Switch to Masked or Full to compute
          file metrics.
        </div>
      ) : snapshot.fileKpis.uniqueFileCount === 0 ? (
        <div className="rounded-[14px] bg-[var(--surface-muted)] p-4 text-[var(--ink-tertiary)]">
          No file activity matched for this range yet.
        </div>
      ) : (
        <>
          {snapshot.fileKpis.pathsMasked && (
            <p className="text-xs text-[var(--ink-tertiary)]">
              Showing filenames only — full paths are masked.
            </p>
          )}

          <div className="grid gap-3 md:grid-cols-4">
            <AnalyticsKpiCard
              label="Unique files"
              value={`${snapshot.fileKpis.uniqueFileCount}`}
              hint={`${snapshot.fileKpis.averageUniqueFilesPerSession} avg per session`}
            />
            <AnalyticsKpiCard
              label="Test vs source"
              value={
                snapshot.fileKpis.testVsSource.sourceMinutes === 0 &&
                snapshot.fileKpis.testVsSource.testMinutes === 0
                  ? '—'
                  : `${snapshot.fileKpis.testVsSource.testShareOfCode}%`
              }
              hint={`${formatMinutes(snapshot.fileKpis.testVsSource.testMinutes)} test · ${formatMinutes(snapshot.fileKpis.testVsSource.sourceMinutes)} source`}
            />
            <AnalyticsKpiCard
              label="Documentation"
              value={formatMinutes(snapshot.fileKpis.documentationMinutes)}
            />
            <AnalyticsKpiCard
              label="Infrastructure"
              value={formatMinutes(snapshot.fileKpis.infrastructureMinutes)}
              hint={`${formatMinutes(snapshot.fileKpis.configMinutes)} config`}
            />
          </div>

          <div className="grid gap-3 lg:grid-cols-2">
            <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
              <h3 className="text-sm font-semibold text-[var(--ink-strong)]">
                Top files
              </h3>
              {snapshot.fileKpis.topFiles.length === 0 ? (
                <p className="text-sm text-[var(--ink-tertiary)]">
                  No file totals yet.
                </p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {snapshot.fileKpis.topFiles.map((file) => (
                    <li
                      key={file.filePath}
                      className="flex items-center justify-between gap-3 text-sm"
                    >
                      <span
                        className="truncate text-[var(--ink-strong)]"
                        title={file.filePath}
                      >
                        {file.fileName}
                      </span>
                      <span className="text-[var(--ink-tertiary)]">
                        {formatMinutes(file.totalMinutes)} · {file.eventCount}{' '}
                        events
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
              <h3 className="text-sm font-semibold text-[var(--ink-strong)]">
                By category
              </h3>
              <div className="mt-2 h-64">
                {snapshot.fileKpis.categoryBreakdown.length === 0 ? (
                  'No categories yet.'
                ) : (
                  <KairosBarChart
                    data={snapshot.fileKpis.categoryBreakdown.map((item) => ({
                      label: item.category,
                      minutes: item.totalMinutes,
                    }))}
                    index="label"
                    categories={['minutes']}
                    colors={[overviewChartPalette[0]]}
                    valueFormatter={(v: number) =>
                      formatDurationMinutes(v, 'axis')
                    }
                    tooltipValueFormatter={(v: number) =>
                      formatDurationMinutes(v, 'long')
                    }
                    seriesLabels={{ minutes: 'Minutes' }}
                    height={240}
                  />
                )}
              </div>
            </article>
          </div>

          {snapshot.fileKpis.longRunningFocusBlocks.length > 0 && (
            <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
              <h3 className="text-sm font-semibold text-[var(--ink-strong)]">
                Focus blocks
              </h3>
              <ul className="mt-2 space-y-2">
                {snapshot.fileKpis.longRunningFocusBlocks.map((block) => (
                  <li
                    key={`${block.filePath}-${block.startTime}`}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span
                      className="truncate text-[var(--ink-strong)]"
                      title={block.filePath}
                    >
                      {block.fileName}
                    </span>
                    <span className="text-[var(--ink-tertiary)]">
                      {formatMinutes(block.durationMinutes)} ·{' '}
                      {block.eventCount} events
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          )}
        </>
      )}
    </section>
  );
}
