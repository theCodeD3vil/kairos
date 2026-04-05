import { AnalyticsKpiCard, formatMinutes } from '@/components/analytics/AnalyticsCards';
import type { AnalyticsSnapshot } from '@/data/mockAnalytics';
import { LanguageIcon } from '@/lib/languageIcons';

type AnalyticsComparisonProps = {
  snapshot: AnalyticsSnapshot;
};

function formatDelta(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}%`;
}

export function AnalyticsComparison({ snapshot }: AnalyticsComparisonProps) {
  const { comparison, summary } = snapshot;

  return (
    <article className="rounded-[14px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
      <h3 className="text-sm font-semibold text-[var(--ink-strong)]">Period comparison</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <AnalyticsKpiCard
          label="Coding time"
          value={formatMinutes(summary.totalMinutes)}
          hint={`Prev: ${formatMinutes(summary.comparison.previousMinutes)}`}
          tone={comparison.minutesDeltaPct >= 0 ? 'positive' : 'negative'}
        />
        <AnalyticsKpiCard
          label="Sessions"
          value={`${summary.sessions}`}
          hint={`Prev: ${summary.comparison.previousSessions}`}
          tone={comparison.sessionsDeltaPct >= 0 ? 'positive' : 'negative'}
        />
        <AnalyticsKpiCard
          label="Active days"
          value={`${summary.activeDays}`}
          hint={`Prev: ${summary.comparison.previousActiveDays}`}
          tone={comparison.activeDaysDeltaPct >= 0 ? 'positive' : 'negative'}
        />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
          <p className="text-xs text-[var(--ink-tertiary)]">Top project change</p>
          <p className="mt-1 text-sm font-medium text-[var(--ink-strong)]">
            {comparison.topProjectChange.current ?? '—'} vs {comparison.topProjectChange.previous ?? '—'}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
          <p className="text-xs text-[var(--ink-tertiary)]">Top language change</p>
          <p className="mt-1 text-sm font-medium text-[var(--ink-strong)]">
            <span className="inline-flex items-center gap-2">
              {comparison.topLanguageChange.current ? <LanguageIcon language={comparison.topLanguageChange.current} size={14} /> : null}
              {comparison.topLanguageChange.current ?? '—'}
            </span>
            <span className="mx-1 text-[var(--ink-tertiary)]">vs</span>
            <span className="inline-flex items-center gap-2">
              {comparison.topLanguageChange.previous ? <LanguageIcon language={comparison.topLanguageChange.previous} size={14} /> : null}
              {comparison.topLanguageChange.previous ?? '—'}
            </span>
          </p>
        </div>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
          <p className="text-xs text-[var(--ink-tertiary)]">Time delta</p>
          <p className="font-numeric text-lg font-semibold text-[var(--ink-strong)]">
            {formatDelta(comparison.minutesDeltaPct)}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
          <p className="text-xs text-[var(--ink-tertiary)]">Sessions delta</p>
          <p className="font-numeric text-lg font-semibold text-[var(--ink-strong)]">
            {formatDelta(comparison.sessionsDeltaPct)}
          </p>
        </div>
        <div className="rounded-lg bg-[var(--surface-subtle)] p-3">
          <p className="text-xs text-[var(--ink-tertiary)]">Active days delta</p>
          <p className="font-numeric text-lg font-semibold text-[var(--ink-strong)]">
            {formatDelta(comparison.activeDaysDeltaPct)}
          </p>
        </div>
      </div>
    </article>
  );
}
