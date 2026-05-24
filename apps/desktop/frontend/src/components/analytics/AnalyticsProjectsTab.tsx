import { useState } from 'react';
import { KairosBarChart } from '@/components/charts/kairos-charts';
import {
  AnalyticsBreakdownList,
  AnalyticsDonut,
  AnalyticsKpiCard,
  formatMinutes,
} from '@/components/analytics/AnalyticsCards';
import { overviewChartPalette } from '@/components/overview/chart-colors';
import { ButtonDropdown } from '@/components/ruixen/button-dropdown';
import type { AnalyticsSnapshot, BreakdownItem } from '@/data/mockAnalytics';
import { formatDurationMinutes } from '@/lib/time-format';

interface AnalyticsProjectsTabProps {
  snapshot: AnalyticsSnapshot;
}

const DEFAULT_TOP_ITEM_LIMIT = 10;
const DEFAULT_SHARE_ITEM_LIMIT = 5;
const TOP_ITEM_LIMIT_OPTIONS = [5, 10, 25, 50] as const;

function buildShareItems(items: BreakdownItem[], limit: number) {
  const visibleItems = items.slice(0, limit);
  const hiddenItems = items.slice(limit);

  if (hiddenItems.length === 0) {
    return visibleItems;
  }

  return [
    ...visibleItems,
    {
      name: 'Other',
      minutes: hiddenItems.reduce((sum, item) => sum + item.minutes, 0),
      share: hiddenItems.reduce((sum, item) => sum + item.share, 0),
      activeDays: hiddenItems.reduce((max, item) => Math.max(max, item.activeDays), 0),
      recent: '',
    },
  ];
}

export function AnalyticsProjectsTab({ snapshot }: AnalyticsProjectsTabProps) {
  const [projectItemLimit, setProjectItemLimit] = useState(DEFAULT_TOP_ITEM_LIMIT);
  const [languageItemLimit, setLanguageItemLimit] = useState(DEFAULT_TOP_ITEM_LIMIT);
  const [projectShareItemLimit, setProjectShareItemLimit] = useState(DEFAULT_SHARE_ITEM_LIMIT);
  const [languageShareItemLimit, setLanguageShareItemLimit] = useState(DEFAULT_SHARE_ITEM_LIMIT);

  return (
    <div className="space-y-6">
      {/* ── Projects ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Projects</h2>

        <div className="grid gap-3 lg:grid-cols-3">
          <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)] lg:col-span-2">
            <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Time by project</h3>
            <div className="mt-2 h-64">
              {snapshot.projects.items.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">No project time yet.</p>
              ) : (
                <KairosBarChart
                  data={snapshot.projects.items.map((p) => ({
                    label: p.name,
                    minutes: p.minutes,
                  }))}
                  index="label"
                  categories={['minutes']}
                  colors={[overviewChartPalette[0]]}
                  rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                  showGridLines
                  valueFormatter={(v) => formatDurationMinutes(Number(v), 'axis')}
                  tooltipValueFormatter={(v) => formatDurationMinutes(Number(v), 'long')}
                  seriesLabels={{ minutes: 'Time Spent' }}
                  height={240}
                />
              )}
            </div>
          </article>

          <AnalyticsDonut
            title="Project share"
            items={buildShareItems(snapshot.projects.items, projectShareItemLimit)}
            action={
              <ButtonDropdown
                label={`Top ${projectShareItemLimit}`}
                items={TOP_ITEM_LIMIT_OPTIONS.map((limit) => ({
                  label: `Top ${limit}`,
                  onClick: () => setProjectShareItemLimit(limit),
                }))}
              />
            }
          />
        </div>

        <AnalyticsBreakdownList
          title="Top projects"
          items={snapshot.projects.items.slice(0, projectItemLimit)}
          emptyMessage="No project time yet."
          action={
            <ButtonDropdown
              label={`Show ${projectItemLimit}`}
              items={TOP_ITEM_LIMIT_OPTIONS.map((limit) => ({
                label: `${limit} items`,
                onClick: () => setProjectItemLimit(limit),
              }))}
            />
          }
        />
      </section>

      {/* ── Languages ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Languages</h2>

        <div className="grid gap-3 lg:grid-cols-3">
          <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)] lg:col-span-2">
            <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Time by language</h3>
            <div className="mt-2 h-64">
              {snapshot.languages.items.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">No language time yet.</p>
              ) : (
                <KairosBarChart
                  data={snapshot.languages.items.map((l) => ({
                    label: l.name,
                    minutes: l.minutes,
                  }))}
                  index="label"
                  categories={['minutes']}
                  colors={[overviewChartPalette[3]]}
                  rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                  showGridLines
                  valueFormatter={(v) => formatDurationMinutes(Number(v), 'axis')}
                  tooltipValueFormatter={(v) => formatDurationMinutes(Number(v), 'long')}
                  seriesLabels={{ minutes: 'Time Spent' }}
                  height={240}
                />
              )}
            </div>
          </article>

          <AnalyticsDonut
            title="Language share"
            items={buildShareItems(snapshot.languages.items, languageShareItemLimit)}
            action={
              <ButtonDropdown
                label={`Top ${languageShareItemLimit}`}
                items={TOP_ITEM_LIMIT_OPTIONS.map((limit) => ({
                  label: `Top ${limit}`,
                  onClick: () => setLanguageShareItemLimit(limit),
                }))}
              />
            }
          />
        </div>

        <AnalyticsBreakdownList
          title="Top languages"
          items={snapshot.languages.items.slice(0, languageItemLimit)}
          emptyMessage="No language time yet."
          showLanguageIcons
          action={
            <ButtonDropdown
              label={`Show ${languageItemLimit}`}
              items={TOP_ITEM_LIMIT_OPTIONS.map((limit) => ({
                label: `${limit} items`,
                onClick: () => setLanguageItemLimit(limit),
              }))}
            />
          }
        />
      </section>

      {/* ── Switches and shares ── */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Switches and shares</h2>

        <div className="grid gap-3 md:grid-cols-4">
          <AnalyticsKpiCard
            label="Project switches"
            value={`${snapshot.contextKpis.projectSwitchCount}`}
            hint={`${snapshot.contextKpis.projectSwitchRatePerDay}/day`}
          />
          <AnalyticsKpiCard
            label="Language switches"
            value={`${snapshot.contextKpis.languageSwitchCount}`}
            hint={`${snapshot.contextKpis.languageSwitchRatePerDay}/day`}
          />
          <AnalyticsKpiCard
            label="Top project share"
            value={`${snapshot.contextKpis.projectFocusScore}%`}
            hint={snapshot.contextKpis.topProjectByTime.name || 'No project'}
          />
          <AnalyticsKpiCard
            label="Top language share"
            value={`${snapshot.contextKpis.languageFocusScore}%`}
            hint={snapshot.contextKpis.topLanguageByTime.name || 'No language'}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
            <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Project time change</h3>
            <div className="mt-2 h-64">
              {snapshot.contextKpis.projectMomentum.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">No project comparison yet.</p>
              ) : (
                <KairosBarChart
                  data={snapshot.contextKpis.projectMomentum.map((p) => ({
                    label: p.name,
                    current: p.currentMinutes,
                    previous: p.previousMinutes,
                  }))}
                  index="label"
                  categories={['current', 'previous']}
                  colors={[overviewChartPalette[0], overviewChartPalette[1]]}
                  rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                  valueFormatter={(v) => formatDurationMinutes(Number(v), 'axis')}
                  tooltipValueFormatter={(v) => formatDurationMinutes(Number(v), 'long')}
                  seriesLabels={{ current: 'Current 7d', previous: 'Previous 7d' }}
                  height={240}
                />
              )}
            </div>
          </article>

          <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
            <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Language time change</h3>
            <div className="mt-2 h-64">
              {snapshot.contextKpis.languageMomentum.length === 0 ? (
                <p className="text-sm text-[var(--ink-muted)]">No language comparison yet.</p>
              ) : (
                <KairosBarChart
                  data={snapshot.contextKpis.languageMomentum.map((l) => ({
                    label: l.name,
                    current: l.currentMinutes,
                    previous: l.previousMinutes,
                  }))}
                  index="label"
                  categories={['current', 'previous']}
                  colors={[overviewChartPalette[3], overviewChartPalette[4]]}
                  rotateLabelX={{ angle: -20, xAxisHeight: 70 }}
                  valueFormatter={(v) => formatDurationMinutes(Number(v), 'axis')}
                  tooltipValueFormatter={(v) => formatDurationMinutes(Number(v), 'long')}
                  seriesLabels={{ current: 'Current 7d', previous: 'Previous 7d' }}
                  height={240}
                />
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
