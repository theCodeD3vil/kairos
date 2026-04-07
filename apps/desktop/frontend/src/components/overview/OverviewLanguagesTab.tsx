import { KairosDonutChart } from '@/components/charts/kairos-charts';
import { overviewChartPalette } from '@/components/overview/chart-colors';
import type { OverviewSnapshot } from '@/components/overview/types';
import { LanguageIcon } from '@/lib/languageIcons';

type OverviewLanguagesTabProps = {
  snapshot: OverviewSnapshot;
};

const pieColors = [...overviewChartPalette];

export function OverviewLanguagesTab({ snapshot }: OverviewLanguagesTabProps) {
  const languages = snapshot.topLanguages;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2">
        <article className="rounded-xl bg-[var(--surface-muted)] p-3">
          <h3 className="text-sm font-medium text-[var(--ink-secondary)]">Language Distribution</h3>
          <div className="mt-2 h-56 grid items-center">
            <KairosDonutChart
              data={languages}
              index="language"
              category="share"
              colors={pieColors}
              height={224}
              valueFormatter={(value) => `${value}%`}
            />
          </div>
        </article>

        <article className="rounded-xl h-max overflow-y-scroll bg-[var(--surface-muted)] p-3">
          <h3 className="text-sm font-medium text-[var(--ink-secondary)]">Top Languages</h3>
          <div className="mt-2 space-y-2">
            {languages.map((language) => (
              <div key={language.language} className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium text-[var(--ink-strong)]">
                    <LanguageIcon language={language.language} size={18} />
                    {language.language}
                  </span>
                  <span className="font-numeric text-sm text-[var(--ink-label)]">{Math.round(language.minutes / 60)}h</span>
                </div>
                <p className="font-numeric mt-1 text-xs text-[var(--ink-tertiary)]">{language.share}% of coding time</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
