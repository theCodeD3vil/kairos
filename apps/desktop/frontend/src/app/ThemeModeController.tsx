import { useEffect } from 'react';
import { desktopResourceKeys } from '@/app/DesktopDataContext';
import { emptySettingsScreenData, loadSettingsScreenData } from '@/lib/backend/settings';
import { useDesktopResource } from '@/lib/hooks/useDesktopResource';
import { applyThemeMode, subscribeToSystemThemeChange } from '@/lib/theme-mode';

export function ThemeModeController() {
  const { data } = useDesktopResource({
    cacheKey: desktopResourceKeys.settings(),
    emptyValue: emptySettingsScreenData(),
    errorMessage: 'Unable to load desktop settings.',
    load: (options) => loadSettingsScreenData(options),
  });

  const themeMode = data.viewModel.general.themeMode;

  useEffect(() => {
    applyThemeMode(themeMode);
    if (themeMode !== 'system') {
      return;
    }
    return subscribeToSystemThemeChange(() => {
      applyThemeMode('system');
    });
  }, [themeMode]);

  return null;
}
