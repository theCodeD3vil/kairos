import { DonutChart } from '@lobehub/charts';
import { FileIcon } from 'react-files-icons';
import type { OverviewSnapshot } from '@/components/overview/types';

type OverviewLanguagesTabProps = {
  snapshot: OverviewSnapshot;
};

const pieColors = ['#0f4f58', '#2c6b74', '#4f8a74', '#b9c95a', '#d4df86'];

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
      <div className="grid gap-3 xl:grid-cols-2">
        <article className="rounded-xl bg-[#f2f5f4] p-3">
          <h3 className="text-sm font-medium text-[#566568]">Language Distribution</h3>
          <div className="mt-2 h-64">
            <DonutChart
              data={languages}
              index="language"
              category="share"
              colors={pieColors}
              showLabel={false}
              style={{ height: 256 }}
              valueFormatter={(value) => `${value}%`}
            />
          </div>
        </article>

        <article className="rounded-xl bg-[#f2f5f4] p-3">
          <h3 className="text-sm font-medium text-[#566568]">Top Languages</h3>
          <div className="mt-2 space-y-2">
            {languages.map((language) => (
              <div key={language.language} className="rounded-lg bg-[#e8edeb] px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium text-[#1d2428]">
                    <FileIcon name={toLanguageFileName(language.language)} width={18} height={18} />
                    {language.language}
                  </span>
                  <span className="font-numeric text-sm text-[#4a5d60]">{Math.round(language.minutes / 60)}h</span>
                </div>
                <p className="font-numeric mt-1 text-xs text-[#5c6d70]">{language.share}% of coding time</p>
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}
