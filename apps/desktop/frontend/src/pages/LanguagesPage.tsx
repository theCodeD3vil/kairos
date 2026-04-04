import { Badge } from '@/components/ui/badge';
import { SectionCard } from '@/components/dashboard/SectionCard';
import { topLanguages } from '@/data/mockDashboard';

export function LanguagesPage() {
  return (
    <div className="space-y-6">
      <SectionCard title="Language Distribution" description="Share of coding time by language.">
        <div className="grid grid-cols-2 gap-4">
          {topLanguages.map((language) => (
            <div key={language.name} className="rounded-lg border border-border/70 bg-muted/15 p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{language.name}</p>
                <Badge variant="outline">{language.trend}</Badge>
              </div>
              <p className="mt-2 text-2xl font-semibold">{language.share}%</p>
              <div className="mt-3 h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary" style={{ width: `${language.share}%` }} />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Recent usage indicator in last 7 days</p>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
