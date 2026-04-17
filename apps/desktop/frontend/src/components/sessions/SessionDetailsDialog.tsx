import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LanguageIcon } from '@/lib/languageIcons';
import { formatDurationMinutes } from '@/lib/time-format';

export type SessionDetailSubSession = {
  id: string;
  language: string;
  durationMinutes: number;
  startAt: string;
  endAt: string;
  machineName: string;
  osLabel: string;
};

export type SessionDetailRecord = {
  id: string;
  project: string;
  language: string;
  durationMinutes: number;
  startAt: string;
  latestActivityAt?: string;
  machineName: string;
  osLabel: string;
  sessionCount: number;
  machineCount: number;
  subSessions: SessionDetailSubSession[];
};

type SessionDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: SessionDetailRecord | null;
};

function DetailMetric({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-xl bg-[var(--surface-subtle)] p-3 shadow-[var(--shadow-inset-soft)]">
      <h3 className="text-xs font-medium text-[var(--ink-muted)]">{title}</h3>
      <p className="mt-1 text-sm font-medium text-[var(--ink-strong)]">{value}</p>
    </article>
  );
}

export function resolveLatestActivityLabel(session: Pick<SessionDetailRecord, 'startAt' | 'latestActivityAt'>) {
  return session.latestActivityAt ?? session.startAt;
}

export function SessionDetailsDialog({ open, onOpenChange, session }: SessionDetailsDialogProps) {
  const averageSubSessionMinutes = session
    ? Math.round(session.durationMinutes / Math.max(1, session.sessionCount))
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-[20px] border-[var(--surface-subtle)] bg-[var(--surface)] p-4">
        {session ? (
          <div className="space-y-4">
            <DialogHeader className="pr-8">
              <DialogTitle className="text-xl text-[var(--ink-strong)]">{session.project}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <DetailMetric title="Total Time" value={formatDurationMinutes(session.durationMinutes, 'short')} />
              <DetailMetric
                title="Subsessions"
                value={`${session.sessionCount} ${session.sessionCount === 1 ? 'session' : 'sessions'}`}
              />
              <DetailMetric title="Avg Subsession" value={formatDurationMinutes(averageSubSessionMinutes, 'short')} />
              <DetailMetric title="Machines" value={`${session.machineCount}`} />
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <DetailMetric title="Language" value={session.language} />
              <DetailMetric title="Latest Activity" value={resolveLatestActivityLabel(session)} />
              <DetailMetric title="Machine" value={`${session.machineName} · ${session.osLabel}`} />
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-medium text-[var(--ink-secondary)]">Subsessions</h3>
              <div className="max-h-[320px] space-y-2 overflow-y-auto pr-1">
                {session.subSessions.map((subSession) => (
                  <article
                    key={subSession.id}
                    className="rounded-xl bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="inline-flex items-center gap-1.5 text-xs text-[var(--ink-tertiary)]">
                        {subSession.language && !subSession.language.startsWith('Mixed') ? (
                          <LanguageIcon language={subSession.language} size={14} />
                        ) : null}
                        <span>{subSession.language}</span>
                      </div>
                      <p className="font-numeric text-xs text-[var(--ink-label)]">
                        {formatDurationMinutes(subSession.durationMinutes, 'short')}
                      </p>
                    </div>
                    <p className="font-numeric mt-1 text-xs text-[var(--ink-tertiary)]">
                      {subSession.startAt} → {subSession.endAt}
                    </p>
                    <p className="mt-1 text-xs text-[var(--ink-tertiary)]">
                      {subSession.machineName} · {subSession.osLabel}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
