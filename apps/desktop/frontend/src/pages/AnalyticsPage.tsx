import { useEffect, useMemo, useRef, useState } from 'react';
import { AnalyticsFilters } from '@/components/analytics/AnalyticsFilters';
import { AnalyticsFilesTab } from '@/components/analytics/AnalyticsFilesTab';
import { AnalyticsProjectsTab } from '@/components/analytics/AnalyticsProjectsTab';
import { AnalyticsSessionsTab } from '@/components/analytics/AnalyticsSessionsTab';
import { AnalyticsSummaryTab } from '@/components/analytics/AnalyticsSummaryTab';
import { AnalyticsTimeTab } from '@/components/analytics/AnalyticsTimeTab';
import { AnalyticsComparison } from '@/components/analytics/AnalyticsComparison';
import { normalizeOverviewRange } from '@/components/overview/types';
import {
  SessionDetailsDialog,
  type SessionDetailRecord,
} from '@/components/sessions/SessionDetailsDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { VercelTabs } from '@/components/ui/vercel-tabs';
import { desktopResourceKeys, getCachedDesktopResource } from '@/app/DesktopDataContext';
import type { AnalyticsFilters as Filters, RecentSessionRow } from '@/data/mockAnalytics';
import { emptyAnalyticsSnapshot, loadAnalyticsSnapshot } from '@/lib/backend/page-data';
import { SHOW_MULTI_MACHINE_UI } from '@/lib/features';
import { useDesktopResource } from '@/lib/hooks/useDesktopResource';
import {
  emptySettingsScreenData,
  loadSettingsScreenData,
  type SettingsScreenData,
} from '@/lib/backend/settings';
import {
  getRangeStorageKey,
  readAnalyticsContextPreference,
  readEnableAdvancedAnalyticsPreference,
  readRangePreference,
  resolveInitialRangePreference,
  saveAnalyticsContextPreference,
  saveRangePreference,
} from '@/lib/settings/preferences';

function resolveInitialAnalyticsFilters(): Filters {
  const settings = getCachedDesktopResource<SettingsScreenData>(desktopResourceKeys.settings());
  const initialRange = resolveInitialRangePreference(
    getRangeStorageKey('analytics'),
    settings?.viewModel.appBehavior.restoreLastSelectedDateRange ?? false,
    settings?.viewModel.general.defaultDateRange,
  );
  const context = settings?.viewModel.appBehavior.reopenLastViewedContext
    ? readAnalyticsContextPreference()
    : null;

  return {
    range: initialRange.range,
    customRange: initialRange.customRange,
    project: context?.project ?? 'all',
    language: context?.language ?? 'all',
    machine: context?.machine ?? 'all',
  };
}

export function AnalyticsPage() {
  const rangeTouchedRef = useRef(false);
  const [filters, setFilters] = useState<Filters>(() => resolveInitialAnalyticsFilters());
  const [activeTab, setActiveTab] = useState('summary');
  const [isSessionDetailsOpen, setIsSessionDetailsOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<SessionDetailRecord | null>(null);
  const { data: settingsData, hasResolvedOnce: hasResolvedSettings } = useDesktopResource({
    cacheKey: desktopResourceKeys.settings(),
    emptyValue: emptySettingsScreenData(),
    errorMessage: 'Unable to load desktop settings.',
    load: (options) => loadSettingsScreenData(options),
  });
  const emptySnapshot = useMemo(() => emptyAnalyticsSnapshot(filters), [filters]);
  const {
    data: snapshot,
    isInitialLoading,
    loadError,
  } = useDesktopResource({
    cacheKey: desktopResourceKeys.analytics(filters),
    emptyValue: emptySnapshot,
    errorMessage: 'Unable to load analytics from persisted desktop data.',
    load: (options) => loadAnalyticsSnapshot(filters, options),
  });

  useEffect(() => {
    if (!hasResolvedSettings || rangeTouchedRef.current) {
      return;
    }

    const restoreLast = settingsData.viewModel.appBehavior.restoreLastSelectedDateRange;
    const restoreContext = settingsData.viewModel.appBehavior.reopenLastViewedContext;
    const saved = restoreLast ? readRangePreference(getRangeStorageKey('analytics')) : null;
    const savedContext = restoreContext ? readAnalyticsContextPreference() : null;
    setFilters((current) => ({
      ...current,
      range:
        saved?.range ?? normalizeOverviewRange(settingsData.viewModel.general.defaultDateRange),
      customRange: saved?.customRange ?? null,
      project: savedContext?.project ?? current.project,
      language: savedContext?.language ?? current.language,
      machine: savedContext?.machine ?? current.machine,
    }));
    rangeTouchedRef.current = true;
  }, [
    hasResolvedSettings,
    settingsData.viewModel.appBehavior.reopenLastViewedContext,
    settingsData.viewModel.appBehavior.restoreLastSelectedDateRange,
    settingsData.viewModel.general.defaultDateRange,
  ]);

  useEffect(() => {
    if (!rangeTouchedRef.current) {
      return;
    }
    saveRangePreference(
      getRangeStorageKey('analytics'),
      filters.range,
      filters.customRange ?? null,
    );
  }, [filters.customRange, filters.range]);

  useEffect(() => {
    if (!rangeTouchedRef.current) {
      return;
    }
    saveAnalyticsContextPreference({
      project: filters.project,
      language: filters.language,
      machine: filters.machine,
    });
  }, [filters.language, filters.machine, filters.project]);

  const showComparisonTab = readEnableAdvancedAnalyticsPreference(
    settingsData.viewModel.appBehavior.enableAdvancedAnalytics,
  );
  const canShowComparisonTab = showComparisonTab && filters.range !== 'all-time';

  useEffect(() => {
    if (!canShowComparisonTab && activeTab === 'comparison') {
      setActiveTab('summary');
    }
  }, [canShowComparisonTab, activeTab]);

  const handleFiltersChange = (next: Filters) => {
    rangeTouchedRef.current = true;
    setFilters(next);
  };

  const formatDetailDateTime = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openSessionDetails = (session: RecentSessionRow) => {
    setSelectedSession({
      id: session.id,
      project: session.project,
      language: session.language,
      durationMinutes: session.durationMinutes,
      startAt: formatDetailDateTime(session.start),
      machineName: session.machine,
      osLabel: session.osLabel,
      sessionCount: session.sessionCount,
      machineCount: session.machineCount,
      subSessions: session.subSessions.map((subSession) => ({
        id: subSession.id,
        language: subSession.language,
        durationMinutes: subSession.durationMinutes,
        startAt: formatDetailDateTime(subSession.start),
        endAt: formatDetailDateTime(subSession.end),
        machineName: subSession.machine,
        osLabel: subSession.osLabel,
      })),
    });
    setIsSessionDetailsOpen(true);
  };

  const skeletonContent = (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
      <Skeleton className="h-56" />
    </div>
  );

  const showSkeleton = isInitialLoading && !loadError;

  const tabs = [
    {
      label: 'Overview',
      value: 'summary',
      content: showSkeleton ? (
        skeletonContent
      ) : (
          <AnalyticsSummaryTab
            snapshot={snapshot}
            filters={filters}
            onSessionSelect={openSessionDetails}
          />
      ),
    },

    {
      label: 'Time',
      value: 'time',
      content: showSkeleton ? skeletonContent : <AnalyticsTimeTab snapshot={snapshot} filters={filters} />,
    },
    {
      label: 'Projects',
      value: 'projects',
      content: showSkeleton ? skeletonContent : <AnalyticsProjectsTab snapshot={snapshot} />,
    },
    {
      label: 'Sessions',
      value: 'sessions',
      content: showSkeleton ? (
        skeletonContent
      ) : (
        <AnalyticsSessionsTab snapshot={snapshot} onSessionSelect={openSessionDetails} />
      ),
    },
    {
      label: 'Files',
      value: 'files',
      content: showSkeleton ? skeletonContent : <AnalyticsFilesTab snapshot={snapshot} />,
    },
    ...(canShowComparisonTab
      ? [
        {
          label: 'Comparison',
          value: 'comparison',
          content: showSkeleton ? (
            skeletonContent
          ) : (
              <AnalyticsComparison snapshot={snapshot} />
          ),
        },
      ]
      : []),
  ];

  return (
    <div className="space-y-3">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-[var(--surface-strong)] p-3">
        <h1 className="text-2xl font-semibold text-[var(--ink-strong)]">Analytics</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full! border-[hsl(var(--border)/0.7)]"
            disabled
          >
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" className="rounded-full!" disabled>
            Share
          </Button>
        </div>
      </section>

      {loadError ? (
        <section className="rounded-[16px] bg-[var(--surface)] p-3">
          <div className="rounded-[14px] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--ink-tertiary)]">
            {loadError}
          </div>
        </section>
      ) : null}

      <section className="rounded-[16px] bg-[var(--surface)] pt-0 px-3 pb-3">
        <VercelTabs
          tabs={tabs}
          defaultTab="summary"
          value={activeTab}
          onValueChange={setActiveTab}
          className="items-start"
          stickyTabList
          stickyClassName="sticky top-0 z-20 rounded-t-[16px] bg-[var(--surface)]/92 p-3 shadow-[var(--shadow-inset-soft)] backdrop-blur"
          rightContent={
            <AnalyticsFilters
              filters={filters}
              onChange={handleFiltersChange}
              projectOptions={snapshot.filters.projects}
              languageOptions={snapshot.filters.languages}
              machineOptions={SHOW_MULTI_MACHINE_UI ? snapshot.filters.machines : []}
              fallbackRange={normalizeOverviewRange(settingsData.viewModel.general.defaultDateRange)}
            />
          }
        />
      </section>

      <SessionDetailsDialog
        open={isSessionDetailsOpen}
        onOpenChange={setIsSessionDetailsOpen}
        session={selectedSession}
      />
    </div>
  );
}
