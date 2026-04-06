import type { CalendarDayDetail } from '@/data/mockCalendar';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';
import { LanguageIcon } from '@/lib/languageIcons';

function formatMinutes(totalMinutes: number) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function DaySummary({ detail }: { detail: CalendarDayDetail }) {
  const cards = [
    { label: 'Total time', value: formatMinutes(detail.totalMinutes) },
    { label: 'Sessions', value: `${detail.sessionCount}` },
    { label: 'Avg session', value: formatMinutes(detail.averageSessionMinutes) },
    { label: 'First active', value: detail.firstActiveAt ?? '—' },
    { label: 'Last active', value: detail.lastActiveAt ?? '—' },
    { label: 'Top project', value: detail.topProject ?? '—' },
    detail.topLanguage ? { label: 'Top language', value: detail.topLanguage } : null,
    SHOW_MULTI_MACHINE_UI ? { label: 'Machines', value: `${detail.machines.length}` } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <article key={card.label} className="rounded-xl bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
          <p className="text-xs text-[var(--ink-secondary)]">{card.label}</p>
          <p className="font-numeric mt-1 text-lg font-semibold text-[var(--ink-strong)] inline-flex items-center gap-2">
            {card.label === 'Top language' ? <LanguageIcon language={card.value} size={16} /> : null}
            <span>{card.value}</span>
          </p>
        </article>
      ))}
    </div>
  );
}
