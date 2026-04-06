import { useEffect, useMemo, useState } from 'react';
import { OverviewRangeSelector } from '@/components/overview/OverviewRangeSelector';
import type { OverviewRange } from '@/components/overview/types';
import type { DateRange } from '@/components/ruixen/range-calendar';
import { MachineScopePlaceholder } from '@/components/system/MachineScopePlaceholder';
import {
  emptySessionsScreenData,
  loadSessionsScreenData,
  type SessionsScreenData,
} from '@/lib/backend/page-data';

function formatMinutes(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export function SessionsPage() {
  const [range, setRange] = useState<OverviewRange>('week');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [screenData, setScreenData] = useState<SessionsScreenData>(() => emptySessionsScreenData('week'));
  const [loadError, setLoadError] = useState<string | null>(null);
  const emptyState = useMemo(() => emptySessionsScreenData(range), [range]);

  useEffect(() => {
    let cancelled = false;

    loadSessionsScreenData(range, customRange)
      .then((nextData) => {
        if (!cancelled) {
          setLoadError(null);
          setScreenData(nextData);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError('Unable to load persisted sessions from the desktop backend.');
          setScreenData(emptyState);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [customRange, emptyState, range]);

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-[var(--surface-strong)] p-4">
        <h1 className="text-2xl font-semibold text-[var(--ink-strong)]">Sessions</h1>
        <div className="flex items-center gap-3">
          <MachineScopePlaceholder
            machines={screenData.knownMachines}
            currentMachineName={screenData.currentMachine.machineName}
          />
          <OverviewRangeSelector
            value={range}
            onChange={setRange}
            customRange={customRange}
            onCustomRangeChange={(nextRange) => {
              setCustomRange(nextRange);
              if (nextRange) setRange('custom');
            }}
          />
        </div>
      </section>

      {loadError ? (
        <section className="rounded-[18px] bg-[var(--surface)] p-4">
          <div className="rounded-xl bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--ink-tertiary)]">
            {loadError}
          </div>
        </section>
      ) : null}

      <section className="rounded-[18px] bg-[var(--surface)] p-4">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Session summary</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <article className="rounded-xl bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
            <p className="text-xs text-[var(--ink-muted)]">Total sessions</p>
            <p className="font-numeric mt-1 text-lg font-semibold text-[var(--ink-strong)]">{screenData.totalSessions}</p>
          </article>
          <article className="rounded-xl bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
            <p className="text-xs text-[var(--ink-muted)]">Average session</p>
            <p className="font-numeric mt-1 text-lg font-semibold text-[var(--ink-strong)]">
              {formatMinutes(screenData.averageSessionMinutes)}
            </p>
          </article>
          <article className="rounded-xl bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
            <p className="text-xs text-[var(--ink-muted)]">Longest session</p>
            <p className="font-numeric mt-1 text-lg font-semibold text-[var(--ink-strong)]">
              {formatMinutes(screenData.longestSessionMinutes)}
            </p>
          </article>
          <article className="rounded-xl bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
            <p className="text-xs text-[var(--ink-muted)]">Last active</p>
            <p className="font-numeric mt-1 text-sm font-medium text-[var(--ink-strong)]">{screenData.lastActiveAt}</p>
          </article>
        </div>
      </section>

      <section className="rounded-[18px] bg-[var(--surface)] p-4">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Recent Sessions</h2>
        <div className="mt-3 space-y-2">
          {screenData.sessions.length === 0 ? (
            <div className="rounded-xl bg-[var(--surface-muted)] p-3 text-sm text-[var(--ink-tertiary)] shadow-[var(--shadow-inset-soft)]">
              No persisted sessions were found for this range.
            </div>
          ) : (
            screenData.sessions.map((session) => (
              <article
                key={session.id}
                className="rounded-xl bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--ink-strong)]">{session.project}</p>
                    <p className="mt-1 text-xs text-[var(--ink-tertiary)]">{session.language}</p>
                  </div>
                  <p className="font-numeric text-sm text-[var(--ink-label)]">
                    {formatMinutes(session.durationMinutes)}
                  </p>
                </div>
                <p className="font-numeric mt-1 text-xs text-[var(--ink-tertiary)]">{session.startAt}</p>
                <p className="mt-1 text-xs text-[var(--ink-tertiary)]">
                  {session.machineName} · {session.osLabel}
                </p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="rounded-[18px] bg-[var(--surface)] p-4">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">Last Active</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <article className="rounded-xl bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
            <p className="text-xs text-[var(--ink-muted)]">Last active machine</p>
            <p className="mt-1 text-sm font-medium text-[var(--ink-strong)]">{screenData.lastActiveMachine}</p>
          </article>
          <article className="rounded-xl bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
            <p className="text-xs text-[var(--ink-muted)]">Current machine</p>
            <p className="mt-1 text-sm font-medium text-[var(--ink-strong)]">{screenData.currentMachine.machineName}</p>
          </article>
        </div>
      </section>
    </div>
  );
}
