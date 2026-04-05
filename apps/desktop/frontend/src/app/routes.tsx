import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from '@/app/AppShell';
import { ActivityPage } from '@/pages/ActivityPage';
import { LanguagesPage } from '@/pages/LanguagesPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { ProjectsPage } from '@/pages/ProjectsPage';
import { SessionsPage } from '@/pages/SessionsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { ThemeTokensPage } from '@/pages/ThemeTokensPage';

export function AppRoutes() {
  const showTheme = import.meta.env.DEV;

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/languages" element={<LanguagesPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        {showTheme ? <Route path="/theme" element={<ThemeTokensPage />} /> : null}
      </Route>
    </Routes>
  );
}
