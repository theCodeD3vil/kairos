import { Suspense, lazy, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/app/AppShell';

const OverviewPage = lazy(async () => import('@/pages/OverviewPage').then((module) => ({ default: module.OverviewPage })));
const AnalyticsPage = lazy(async () => import('@/pages/AnalyticsPage').then((module) => ({ default: module.AnalyticsPage })));
const SessionsPage = lazy(async () => import('@/pages/SessionsPage').then((module) => ({ default: module.SessionsPage })));
const CalendarPage = lazy(async () => import('@/pages/CalendarPage').then((module) => ({ default: module.CalendarPage })));
const SettingsPage = lazy(async () => import('@/pages/SettingsPage').then((module) => ({ default: module.SettingsPage })));
const ThemeTokensPage = lazy(async () => import('@/pages/ThemeTokensPage').then((module) => ({ default: module.ThemeTokensPage })));

function RouteFallback() {
  return (
    <div className="rounded-[16px] bg-[var(--surface)] p-4 text-sm text-[var(--ink-tertiary)]">
      Loading…
    </div>
  );
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

export function AppRoutes() {
  const showTheme = import.meta.env.DEV;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={withSuspense(<OverviewPage />)} />
        <Route path="/analytics" element={withSuspense(<AnalyticsPage />)} />
        <Route path="/sessions" element={withSuspense(<SessionsPage />)} />
        <Route path="/calendar" element={withSuspense(<CalendarPage />)} />
        <Route path="/settings" element={withSuspense(<SettingsPage />)} />
        {showTheme ? <Route path="/theme" element={withSuspense(<ThemeTokensPage />)} /> : null}
      </Route>
    </Routes>
  );
}
