import { DonutChart } from '@lobehub/charts';
import { FileIcon } from 'react-files-icons';
import { overviewChartPalette } from '@/components/overview/chart-colors';
import type { OverviewSnapshot } from '@/components/overview/types';

type OverviewLanguagesTabProps = {
  snapshot: OverviewSnapshot;
};

const pieColors = [...overviewChartPalette];

function toLanguageFileName(language: string) {
  const normalized = language.trim().toLowerCase();
  const extensionByLanguage: Record<string, string> = {
    css: 'css',
    go: 'go',
    javascript: 'js',
    json: 'json',
    markdown: 'md',
    python: 'py',
    rust: 'rs',
    sql: 'sql',
    typescript: 'ts',
    yaml: 'yml',
  };
  const ext = extensionByLanguage[normalized] ?? 'txt';
  return `language.${ext}`;
}

export function OverviewLanguagesTab({ snapshot }: OverviewLanguagesTabProps) {
  const languages = snapshot.topLanguages;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-2">
        <article className="rounded-xl bg-[var(--surface-muted)] p-3">
          <h3 className="text-sm font-medium text-[var(--ink-secondary)]">Language Distribution</h3>
          <div className="mt-2 h-56 grid items-center">
            <DonutChart
              data={languages}
              index="language"
              category="share"
              colors={pieColors}
              showAnimation
              animationDuration={1000}
              showLabel={false}
              style={{ height: 224 }}
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
                    <FileIcon name={toLanguageFileName(language.language)} width={18} height={18} />
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
