import { useEffect, useMemo, useRef, useState } from 'react';
import { OverviewRangeSelector } from '@/components/overview/OverviewRangeSelector';
import { normalizeOverviewRange, type OverviewRange } from '@/components/overview/types';
import type { DateRange } from '@/components/ruixen/range-calendar';
import { MachineScopePlaceholder } from '@/components/system/MachineScopePlaceholder';
import { SessionDetailsDialog, type SessionDetailRecord } from '@/components/sessions/SessionDetailsDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { desktopResourceKeys } from '@/app/DesktopDataContext';
import {
  emptySessionsScreenData,
  loadSessionsScreenData,
  type SessionsScreenData,
} from '@/lib/backend/page-data';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';
import { useDesktopResource } from '@/lib/hooks/useDesktopResource';
import { emptySettingsScreenData, loadSettingsScreenData } from '@/lib/backend/settings';
import { LanguageIcon } from '@/lib/languageIcons';
import { resolveRangeAfterCustomRangeChange } from '@/lib/overview-range';
import { getRangeStorageKey, readRangePreference, saveRangePreference } from '@/lib/settings/preferences';
import { formatDurationMinutes } from '@/lib/time-format';
import { createSessionDetailRecord } from '@/pages/sessions-helpers';

export function SessionsPage() {
  const rangeTouchedRef = useRef(false);
  const [range, setRange] = useState<OverviewRange>('week');
  const [customRange, setCustomRange] = useState<DateRange | null>(null);
  const [isSessionDetailsOpen, setIsSessionDetailsOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionDetailRecord | null>(null);
  const { data: settingsData, hasResolvedOnce: hasResolvedSettings } = useDesktopResource({
    cacheKey: desktopResourceKeys.settings(),
    emptyValue: emptySettingsScreenData(),
    errorMessage: 'Unable to load desktop settings.',
    load: (options) => loadSettingsScreenData(options),
  });
  const emptyState = useMemo(() => emptySessionsScreenData(range), [range]);
  const {
    data: screenData,
    isInitialLoading,
    loadError,
  } = useDesktopResource<SessionsScreenData>({
    cacheKey: desktopResourceKeys.sessions(range, customRange),
    emptyValue: emptyState,
    errorMessage: 'Unable to load persisted sessions from the desktop backend.',
    load: (options) => loadSessionsScreenData(range, customRange, options),
  });

  useEffect(() => {
    if (!hasResolvedSettings || rangeTouchedRef.current) {
      return;
    }

    const restoreLast = settingsData.viewModel.appBehavior.restoreLastSelectedDateRange;
    const saved = restoreLast ? readRangePreference(getRangeStorageKey('sessions')) : null;
    if (saved) {
      setRange(saved.range);
      setCustomRange(saved.customRange);
      rangeTouchedRef.current = true;
      return;
    }

    setRange(normalizeOverviewRange(settingsData.viewModel.general.defaultDateRange));
    setCustomRange(null);
    rangeTouchedRef.current = true;
  }, [
    hasResolvedSettings,
    settingsData.viewModel.appBehavior.restoreLastSelectedDateRange,
    settingsData.viewModel.general.defaultDateRange,
  ]);

  useEffect(() => {
    if (!rangeTouchedRef.current) {
      return;
    }
    saveRangePreference(getRangeStorageKey('sessions'), range, customRange);
  }, [customRange, range]);

  const handleRangeChange = (nextRange: OverviewRange) => {
    rangeTouchedRef.current = true;
    setRange(nextRange);
  };

  const openSessionDetails = (session: SessionsScreenData['sessions'][number]) => {
    setSelectedSession(createSessionDetailRecord(session));
    setIsSessionDetailsOpen(true);
  };

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-[var(--surface-strong)] p-4">
        <h1 className="text-2xl font-semibold text-[var(--ink-strong)]">Sessions</h1>
        <div className="flex items-center gap-3">
          {SHOW_MULTI_MACHINE_UI ? (
            <MachineScopePlaceholder
              machines={screenData.knownMachines}
              currentMachineName={screenData.currentMachine.machineName}
            />
          ) : null}
          <OverviewRangeSelector
            value={range}
            onChange={handleRangeChange}
            customRange={customRange}
            onCustomRangeChange={(nextRange) => {
              rangeTouchedRef.current = true;
              setCustomRange(nextRange);
              setRange((current) => resolveRangeAfterCustomRangeChange(
                current,
                nextRange,
                normalizeOverviewRange(settingsData.viewModel.general.defaultDateRange),
              ));
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

      {isInitialLoading && !loadError ? (
        <>
          <section className="rounded-[18px] bg-[var(--surface)] p-4">
            <div className="grid gap-3 md:grid-cols-4">
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
              <Skeleton className="h-24" />
            </div>
          </section>
          <section className="rounded-[18px] bg-[var(--surface)] p-4">
            <div className="space-y-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
          </section>
        </>
      ) : (
        <>
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
                  {formatDurationMinutes(screenData.averageSessionMinutes, 'short')}
                </p>
              </article>
              <article className="rounded-xl bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
                <p className="text-xs text-[var(--ink-muted)]">Longest session</p>
                <p className="font-numeric mt-1 text-lg font-semibold text-[var(--ink-strong)]">
                  {formatDurationMinutes(screenData.longestSessionMinutes, 'short')}
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
                  <button
                    key={session.id}
                    type="button"
                    onClick={() => openSessionDetails(session)}
                    className="w-full rounded-xl bg-[var(--surface-muted)] p-3 text-left shadow-[var(--shadow-inset-soft)] transition-colors hover:bg-[var(--surface-subtle)]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--ink-strong)]">{session.project}</p>
                        <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-[var(--ink-tertiary)]">
                          {session.language && !session.language.startsWith('Mixed') ? (
                            <LanguageIcon language={session.language} size={14} />
                          ) : null}
                          <span>{session.language}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {session.sessionCount} {session.sessionCount === 1 ? 'session' : 'sessions'}
                          </span>
                        </p>
                      </div>
                      <p className="font-numeric text-sm text-[var(--ink-label)]">
                        {formatDurationMinutes(session.durationMinutes, 'short')}
                      </p>
                    </div>
                    <p className="font-numeric mt-1 text-xs text-[var(--ink-tertiary)]">
                      {session.rangeStartAt} → {session.rangeEndAt}
                    </p>
                    {SHOW_MULTI_MACHINE_UI ? (
                      <p className="mt-1 text-xs text-[var(--ink-tertiary)]">
                        {session.machineName} · {session.osLabel}
                      </p>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </section>
        </>
      )}

      {SHOW_MULTI_MACHINE_UI ? (
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
      ) : null}

      <SessionDetailsDialog
        open={isSessionDetailsOpen}
        onOpenChange={setIsSessionDetailsOpen}
        session={selectedSession}
      />
    </div>
  );
}
