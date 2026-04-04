import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { OverviewSnapshot } from '@/components/overview/types';

type OverviewLanguagesTabProps = {
  snapshot: OverviewSnapshot;
};

const pieColors = ['#0f4f58', '#365db8', '#58a073', '#95b665', '#d6c95e'];

export function OverviewLanguagesTab({ snapshot }: OverviewLanguagesTabProps) {
  const languages = snapshot.topLanguages;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 xl:grid-cols-2">
        <article className="rounded-xl bg-[#f2f5f4] p-3">
          <h3 className="text-sm font-medium text-[#566568]">Language Distribution</h3>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={languages} dataKey="share" nameKey="language" innerRadius={52} outerRadius={95}>
                  {languages.map((language, index) => (
                    <Cell key={language.language} fill={pieColors[index % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-xl bg-[#f2f5f4] p-3">
          <h3 className="text-sm font-medium text-[#566568]">Top Languages</h3>
          <div className="mt-2 space-y-2">
            {languages.map((language) => (
              <div key={language.language} className="rounded-lg bg-[#e8edeb] px-3 py-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-[#1d2428]">{language.language}</span>
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
