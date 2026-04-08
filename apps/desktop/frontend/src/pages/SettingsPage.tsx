import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { BrowserOpenURL } from '../../wailsjs/runtime/runtime';
import { desktopResourceKeys } from '@/app/DesktopDataContext';
import { KairosFileIcon } from '@/components/file-icons/KairosFileIcon';
import { useToast } from '@/components/toast/ToastProvider';
import { VercelTabs } from '@/components/ui/vercel-tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ClearLocalData } from '../../wailsjs/go/main/App';
import { ExclusionEditor } from '@/components/settings/ExclusionEditor';
import {
  ResetButton,
  SettingsActionRow,
  SettingsInfoGrid,
  SettingsInput,
  SettingsRow,
  SettingsSection,
  SettingsSelect,
  SettingsStatusPanel,
  SettingsToggle,
} from '@/components/settings/SettingsPrimitives';
import {
  checkDesktopUpdate,
  emptySettingsScreenData,
  getAutostartRegistrationStatus,
  getVSCodeBridgeReachability,
  loadSettingsScreenData,
  resetSettingsSectionViewModel,
  reconnectVSCodeExtension,
  saveAppBehaviorSettings,
  saveExclusionsSettings,
  saveExtensionSettings,
  saveGeneralSettings,
  savePrivacySettings,
  saveTrackingSettings,
  refreshVSCodeExtensionStatus,
  settingsSections,
} from '@/lib/backend/settings';
import { useDesktopResource } from '@/lib/hooks/useDesktopResource';

const MIN_IDLE_TIMEOUT_MINUTES = 5;
const MIN_SESSION_MERGE_THRESHOLD_MINUTES = 0;
const MIN_HEARTBEAT_INTERVAL_SECONDS = 1;
const THRESHOLD_SAVE_DEBOUNCE_MS = 500;
const OBFUSCATED_STORAGE_PATH_LABEL = '••••••••••';

export function SettingsPage() {
  const { error, success } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const initialData = emptySettingsScreenData();
  const [general, setGeneral] = useState(initialData.viewModel.general);
  const [privacy, setPrivacy] = useState(initialData.viewModel.privacy);
  const [tracking, setTracking] = useState(initialData.viewModel.tracking);
  const [exclusions, setExclusions] = useState(initialData.viewModel.exclusions);
  const [vscodeExtension, setVscodeExtension] = useState(initialData.viewModel.vscodeExtension);
  const [appBehavior, setAppBehavior] = useState(initialData.viewModel.appBehavior);
  const [dataStorage, setDataStorage] = useState(initialData.viewModel.dataStorage);
  const [about, setAbout] = useState(initialData.viewModel.about);
  const [currentMachine, setCurrentMachine] = useState(initialData.currentMachine);
  const [appStatus, setAppStatus] = useState(initialData.appStatus);
  const [bridgeReachable, setBridgeReachable] = useState<boolean | null>(null);
  const [autostartRegistrationLabel, setAutostartRegistrationLabel] = useState('Checking…');
  const [updateStatusLabel, setUpdateStatusLabel] = useState('Checking…');
  const [latestVersionLabel, setLatestVersionLabel] = useState('—');
  const [updateReleaseUrl, setUpdateReleaseUrl] = useState('');
  const [updateCheckedAtLabel, setUpdateCheckedAtLabel] = useState('—');
  const [idleTimeoutDraft, setIdleTimeoutDraft] = useState(initialData.viewModel.tracking.idleTimeoutMinutes);
  const [idleTimeoutWarning, setIdleTimeoutWarning] = useState<string | null>(null);
  const [sessionMergeDraft, setSessionMergeDraft] = useState(initialData.viewModel.tracking.sessionMergeThresholdMinutes);
  const [sessionMergeWarning, setSessionMergeWarning] = useState<string | null>(null);
  const [heartbeatIntervalDraft, setHeartbeatIntervalDraft] = useState(initialData.viewModel.vscodeExtension.heartbeatIntervalSeconds);
  const [heartbeatIntervalWarning, setHeartbeatIntervalWarning] = useState<string | null>(null);
  const persistCountRef = useRef(0);

  const applyScreenData = useCallback((next: Awaited<ReturnType<typeof loadSettingsScreenData>>) => {
    setGeneral(next.viewModel.general);
    setPrivacy(next.viewModel.privacy);
    setTracking(next.viewModel.tracking);
    setExclusions(next.viewModel.exclusions);
    setVscodeExtension(next.viewModel.vscodeExtension);
    setAppBehavior(next.viewModel.appBehavior);
    setDataStorage(next.viewModel.dataStorage);
    setAbout(next.viewModel.about);
    setCurrentMachine(next.currentMachine);
    setAppStatus(next.appStatus);
  }, []);

  const {
    data: settingsScreenData,
    isInitialLoading,
    loadError,
    refresh: refreshSettings,
  } = useDesktopResource({
    cacheKey: desktopResourceKeys.settings(),
    emptyValue: initialData,
    errorMessage: 'Unable to load desktop settings.',
    load: (options) => loadSettingsScreenData(options),
  });

  useEffect(() => {
    if (persistCountRef.current > 0) {
      return;
    }
    applyScreenData(settingsScreenData);
  }, [applyScreenData, settingsScreenData]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const reachable = await getVSCodeBridgeReachability();
      if (active) {
        setBridgeReachable(reachable);
      }
    })();
    return () => {
      active = false;
    };
  }, [settingsScreenData]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const status = await checkDesktopUpdate();
      if (!active) {
        return;
      }

      if (!status) {
        setUpdateStatusLabel('Unavailable');
        setLatestVersionLabel('—');
        setUpdateReleaseUrl('');
        setUpdateCheckedAtLabel('—');
        return;
      }

      const checkedAt = status.checkedAt ? new Date(status.checkedAt) : null;
      setUpdateCheckedAtLabel(
        checkedAt && !Number.isNaN(checkedAt.getTime())
          ? checkedAt.toLocaleString()
          : '—',
      );
      setLatestVersionLabel(status.latestVersion || '—');
      setUpdateReleaseUrl(status.releaseUrl || status.assetUrl || '');

      if (status.error) {
        setUpdateStatusLabel('Check failed');
        return;
      }

      setUpdateStatusLabel(status.updateAvailable ? 'Update available' : 'Up to date');
    })();

    return () => {
      active = false;
    };
  }, [settingsScreenData]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const status = await getAutostartRegistrationStatus();
      if (!active) {
        return;
      }

      if (!status) {
        setAutostartRegistrationLabel('Unavailable');
        return;
      }

      setAutostartRegistrationLabel(`${status.enabled ? 'Enabled' : 'Disabled'} · ${status.platform} (${status.mechanism})`);
    })();

    return () => {
      active = false;
    };
  }, [settingsScreenData]);

  const reloadSettings = useCallback(async (options?: { silent?: boolean }) => {
    try {
      await refreshSettings('manual');
      return true;
    } catch (cause) {
      if (!options?.silent) {
        error('Settings Load Failed', cause instanceof Error ? cause.message : 'Unable to load desktop settings.');
      }
      return false;
    }
  }, [error, refreshSettings]);

  const persistSection = useCallback(
    async <T,>(next: T, save: (value: T) => Promise<T>, apply: (value: T) => void, label: string) => {
      apply(next);
      persistCountRef.current += 1;
      try {
        const saved = await save(next);
        apply(saved);
      } catch (cause) {
        error(label, cause instanceof Error ? cause.message : 'Unable to persist settings.');
        void reloadSettings({ silent: true });
      } finally {
        persistCountRef.current = Math.max(0, persistCountRef.current - 1);
      }
    },
    [error, reloadSettings],
  );

  const updateGeneralState = useCallback((next: typeof general) => {
    void persistSection(next, saveGeneralSettings, setGeneral, 'General Settings');
  }, [persistSection]);
  const updatePrivacyState = useCallback((next: typeof privacy) => {
    void persistSection(next, savePrivacySettings, setPrivacy, 'Privacy Settings');
  }, [persistSection]);
  const updateTrackingState = useCallback((next: typeof tracking) => {
    void persistSection(next, saveTrackingSettings, setTracking, 'Tracking Settings');
  }, [persistSection]);
  const updateExclusionsState = useCallback((next: typeof exclusions) => {
    void persistSection(next, saveExclusionsSettings, setExclusions, 'Exclusions Settings');
  }, [persistSection]);
  const updateExtensionState = useCallback((next: typeof vscodeExtension) => {
    void persistSection(next, saveExtensionSettings, setVscodeExtension, 'VS Code Extension Settings');
  }, [persistSection]);
  const updateAppBehaviorState = useCallback((next: typeof appBehavior) => {
    void persistSection(next, saveAppBehaviorSettings, setAppBehavior, 'App Behavior Settings');
  }, [persistSection]);

  useEffect(() => {
    setIdleTimeoutDraft(tracking.idleTimeoutMinutes);
  }, [tracking.idleTimeoutMinutes]);

  useEffect(() => {
    setSessionMergeDraft(tracking.sessionMergeThresholdMinutes);
  }, [tracking.sessionMergeThresholdMinutes]);

  useEffect(() => {
    setHeartbeatIntervalDraft(vscodeExtension.heartbeatIntervalSeconds);
  }, [vscodeExtension.heartbeatIntervalSeconds]);

  useEffect(() => {
    const trimmed = idleTimeoutDraft.trim();
    if (trimmed === '') {
      setIdleTimeoutWarning(null);
      return;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed)) {
      setIdleTimeoutWarning('Enter a whole number.');
      return;
    }

    if (parsed < MIN_IDLE_TIMEOUT_MINUTES) {
      setIdleTimeoutWarning(`Minimum is ${MIN_IDLE_TIMEOUT_MINUTES} minutes.`);
      return;
    }

    setIdleTimeoutWarning(null);

    const timeoutId = window.setTimeout(() => {
      const nextValue = String(parsed);
      if (tracking.idleTimeoutMinutes !== nextValue) {
        updateTrackingState({ ...tracking, idleTimeoutMinutes: nextValue });
      }
    }, THRESHOLD_SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [idleTimeoutDraft, tracking, updateTrackingState]);

  useEffect(() => {
    const trimmed = sessionMergeDraft.trim();
    if (trimmed === '') {
      setSessionMergeWarning(null);
      return;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed)) {
      setSessionMergeWarning('Enter a whole number.');
      return;
    }

    if (parsed < MIN_SESSION_MERGE_THRESHOLD_MINUTES) {
      setSessionMergeWarning(`Minimum is ${MIN_SESSION_MERGE_THRESHOLD_MINUTES} minutes.`);
      return;
    }

    setSessionMergeWarning(null);

    const timeoutId = window.setTimeout(() => {
      const nextValue = String(parsed);
      if (tracking.sessionMergeThresholdMinutes !== nextValue) {
        updateTrackingState({ ...tracking, sessionMergeThresholdMinutes: nextValue });
      }
    }, THRESHOLD_SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [sessionMergeDraft, tracking, updateTrackingState]);

  useEffect(() => {
    const trimmed = heartbeatIntervalDraft.trim();
    if (trimmed === '') {
      setHeartbeatIntervalWarning(null);
      return;
    }

    const parsed = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(parsed)) {
      setHeartbeatIntervalWarning('Enter a whole number.');
      return;
    }

    if (parsed < MIN_HEARTBEAT_INTERVAL_SECONDS) {
      setHeartbeatIntervalWarning(`Minimum is ${MIN_HEARTBEAT_INTERVAL_SECONDS} second.`);
      return;
    }

    setHeartbeatIntervalWarning(null);

    const timeoutId = window.setTimeout(() => {
      const nextValue = String(parsed);
      if (vscodeExtension.heartbeatIntervalSeconds !== nextValue) {
        updateExtensionState({ ...vscodeExtension, heartbeatIntervalSeconds: nextValue });
      }
    }, THRESHOLD_SAVE_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [heartbeatIntervalDraft, updateExtensionState, vscodeExtension]);

  const handleResetSection = useCallback(async (section: string, title: string) => {
    try {
      const next = await resetSettingsSectionViewModel(section);
      applyScreenData(next);
      success(title, 'Section reset to desktop defaults.');
    } catch (cause) {
      error(title, cause instanceof Error ? cause.message : 'Unable to reset section.');
    }
  }, [applyScreenData, error, success]);

  const canOpenRepository = about.repositoryLabel.startsWith('http');
  const canOpenReleaseNotes = about.releaseNotesLabel.startsWith('http');

  const tabs = [
    {
      label: 'General',
      value: 'general',
      content: (
        <SettingsSection title="General" action={<ResetButton onClick={() => void handleResetSection(settingsSections.general, 'General Settings')} />}>
          <SettingsRow label="Machine display name" helper="Shown in the desktop app and used for machine attribution labels.">
            <SettingsInput
              value={general.machineDisplayName}
              onChange={(event) => updateGeneralState({ ...general, machineDisplayName: event.target.value })}
            />
          </SettingsRow>
          <SettingsRow label="Default date range" helper="Used when opening Overview, Sessions, and Analytics without a saved page state.">
            <SettingsSelect
              value={general.defaultDateRange}
              onChange={(event) => updateGeneralState({ ...general, defaultDateRange: event.target.value as typeof general.defaultDateRange })}
              options={[
                { label: '1D', value: 'today' },
                { label: '7D', value: 'week' },
                { label: '1M', value: 'month' },
                { label: 'custom', value: 'custom' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Time format" helper="Controls how times are shown across the desktop app.">
            <SettingsSelect
              value={general.timeFormat}
              onChange={(event) => updateGeneralState({ ...general, timeFormat: event.target.value as typeof general.timeFormat })}
              options={[
                { label: '24 hour', value: '24h' },
                { label: '12 hour', value: '12h' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Week start day" helper="Used for week-based views such as Overview trends and calendar logic.">
            <SettingsSelect
              value={general.weekStartDay}
              onChange={(event) => updateGeneralState({ ...general, weekStartDay: event.target.value as typeof general.weekStartDay })}
              options={[
                { label: 'Monday', value: 'Monday' },
                { label: 'Sunday', value: 'Sunday' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Preferred landing page" helper="Page to open first when the desktop app starts.">
            <SettingsSelect
              value={general.landingPage}
              onChange={(event) => updateGeneralState({ ...general, landingPage: event.target.value as typeof general.landingPage })}
              options={[
                { label: 'Overview', value: 'overview' },
                { label: 'Analytics', value: 'analytics' },
                { label: 'Calendar', value: 'calendar' },
                { label: 'Sessions', value: 'sessions' },
              ]}
            />
          </SettingsRow>
        </SettingsSection>
      ),
    },
    {
      label: 'Privacy',
      value: 'privacy',
      content: (
        <SettingsSection title="Privacy" action={<ResetButton onClick={() => void handleResetSection(settingsSections.privacy, 'Privacy Settings')} />}>
          <SettingsRow label="Local-only mode" helper="Stores and processes data on this device.">
            <SettingsToggle checked={privacy.localOnlyMode} onChange={(next) => updatePrivacyState({ ...privacy, localOnlyMode: next })} />
          </SettingsRow>
          <SettingsRow label="Cloud sync" helper="Sync activity data across your devices.">
            <SettingsToggle
              checked={privacy.cloudSyncEnabled}
              onChange={() => {}}
              disabled
            />
          </SettingsRow>
          <SettingsRow label="File path visibility" helper="Controls whether file paths are stored and returned as full paths, masked names, or hidden values.">
            <SettingsSelect
              value={privacy.filePathVisibility}
              onChange={(event) => updatePrivacyState({ ...privacy, filePathVisibility: event.target.value as typeof privacy.filePathVisibility })}
              options={[
                { label: 'Masked', value: 'masked' },
                { label: 'Full path', value: 'full' },
                { label: 'Hidden', value: 'hidden' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Show machine names" helper="Affects whether machine names are shown in desktop-facing summaries when available.">
            <SettingsToggle checked={privacy.showMachineNames} onChange={(next) => updatePrivacyState({ ...privacy, showMachineNames: next })} />
          </SettingsRow>
          <SettingsRow label="Show hostname" helper="Controls whether hostnames can appear in desktop-facing device details.">
            <SettingsToggle checked={privacy.showHostname} onChange={(next) => updatePrivacyState({ ...privacy, showHostname: next })} />
          </SettingsRow>
          <SettingsRow label="Obfuscate sensitive project names" helper="Masks project labels in desktop-facing data where privacy rules apply.">
            <SettingsToggle checked={privacy.obfuscateSensitiveProjects} onChange={(next) => updatePrivacyState({ ...privacy, obfuscateSensitiveProjects: next })} />
          </SettingsRow>
          <ExclusionEditor
            label="Sensitive project names"
            items={privacy.sensitiveProjectNames}
            placeholder="Add sensitive project name"
            onChange={(items) => updatePrivacyState({ ...privacy, sensitiveProjectNames: items })}
          />
          <SettingsRow label="Minimize extension metadata" helper="Reduces non-essential VS Code metadata included in extension traffic and status.">
            <SettingsToggle checked={privacy.minimizeExtensionMetadata} onChange={(next) => updatePrivacyState({ ...privacy, minimizeExtensionMetadata: next })} />
          </SettingsRow>
        </SettingsSection>
      ),
    },
    {
      label: 'Tracking',
      value: 'tracking',
      content: (
        <SettingsSection title="Tracking" action={<ResetButton onClick={() => void handleResetSection(settingsSections.tracking, 'Tracking Settings')} />}>
          <SettingsRow label="Tracking enabled" helper="Turns Kairos activity ingestion on or off at the desktop authority layer.">
            <SettingsToggle checked={tracking.trackingEnabled} onChange={(next) => updateTrackingState({ ...tracking, trackingEnabled: next })} />
          </SettingsRow>
          <SettingsRow label="Idle detection" helper="Allows gaps in activity to split sessions instead of treating all events as one continuous run.">
            <SettingsToggle checked={tracking.idleDetectionEnabled} onChange={(next) => updateTrackingState({ ...tracking, idleDetectionEnabled: next })} />
          </SettingsRow>
          <SettingsRow label="Track project activity" helper="Keeps project names as first-class tracked fields in events and summaries.">
            <SettingsToggle checked={tracking.trackProjectActivity} onChange={(next) => updateTrackingState({ ...tracking, trackProjectActivity: next })} />
          </SettingsRow>
          <SettingsRow label="Track language activity" helper="Keeps language as a first-class tracked field through ingestion, sessions, and analytics.">
            <SettingsToggle checked={tracking.trackLanguageActivity} onChange={(next) => updateTrackingState({ ...tracking, trackLanguageActivity: next })} />
          </SettingsRow>
          <SettingsRow label="Track machine attribution" helper="Preserves machine-level attribution for raw events, sessions, and summaries.">
            <SettingsToggle checked={tracking.trackMachineAttribution} onChange={(next) => updateTrackingState({ ...tracking, trackMachineAttribution: next })} />
          </SettingsRow>
          <SettingsRow label="Track session boundaries" helper="Keeps session derivation enabled when rebuilding sessions from persisted raw events.">
            <SettingsToggle checked={tracking.trackSessionBoundaries} onChange={(next) => updateTrackingState({ ...tracking, trackSessionBoundaries: next })} />
          </SettingsRow>
          <SettingsRow label="Idle timeout threshold" helper="Minutes. If the gap between events exceeds this value, Kairos starts a new session.">
            <div className="w-full max-w-sm space-y-1">
              <SettingsInput
                value={idleTimeoutDraft}
                inputMode="numeric"
                onChange={(event) => {
                  setIdleTimeoutDraft(event.target.value);
                }}
                onBlur={() => {
                  const trimmed = idleTimeoutDraft.trim();
                  const parsed = Number.parseInt(trimmed, 10);
                  if (!Number.isFinite(parsed) || parsed < MIN_IDLE_TIMEOUT_MINUTES) {
                    const minimum = String(MIN_IDLE_TIMEOUT_MINUTES);
                    setIdleTimeoutDraft(minimum);
                    if (tracking.idleTimeoutMinutes !== minimum) {
                      updateTrackingState({ ...tracking, idleTimeoutMinutes: minimum });
                    }
                    return;
                  }

                  const normalized = String(parsed);
                  if (normalized !== idleTimeoutDraft) {
                    setIdleTimeoutDraft(normalized);
                  }
                }}
              />
              {idleTimeoutWarning ? (
                <p className="text-xs text-[var(--ink-warning)]">{idleTimeoutWarning}</p>
              ) : null}
            </div>
          </SettingsRow>
          <SettingsRow label="Session merge threshold" helper="Minutes. Adjacent same-day sessions within this gap can be merged during session rebuilds.">
            <div className="w-full max-w-sm space-y-1">
              <SettingsInput
                value={sessionMergeDraft}
                inputMode="numeric"
                onChange={(event) => {
                  setSessionMergeDraft(event.target.value);
                }}
                onBlur={() => {
                  const trimmed = sessionMergeDraft.trim();
                  const parsed = Number.parseInt(trimmed, 10);
                  if (!Number.isFinite(parsed) || parsed < MIN_SESSION_MERGE_THRESHOLD_MINUTES) {
                    const minimum = String(MIN_SESSION_MERGE_THRESHOLD_MINUTES);
                    setSessionMergeDraft(minimum);
                    if (tracking.sessionMergeThresholdMinutes !== minimum) {
                      updateTrackingState({ ...tracking, sessionMergeThresholdMinutes: minimum });
                    }
                    return;
                  }

                  const normalized = String(parsed);
                  if (normalized !== sessionMergeDraft) {
                    setSessionMergeDraft(normalized);
                  }
                }}
              />
              {sessionMergeWarning ? (
                <p className="text-xs text-[var(--ink-warning)]">{sessionMergeWarning}</p>
              ) : null}
            </div>
          </SettingsRow>
          <SettingsRow label="Detect active coding window" helper="Detect and prioritize active coding windows.">
            <SettingsToggle
              checked={tracking.detectActiveCodingWindow}
              onChange={() => {}}
              disabled
            />
          </SettingsRow>
          <SettingsRow label="Background activity capture" helper="Capture activity while the app runs in the background.">
            <SettingsToggle
              checked={tracking.backgroundActivityCapture}
              onChange={() => {}}
              disabled
            />
          </SettingsRow>
        </SettingsSection>
      ),
    },
    {
      label: 'Exclusions',
      value: 'exclusions',
      content: (
        <SettingsSection title="Exclusions" action={<ResetButton onClick={() => void handleResetSection(settingsSections.exclusions, 'Exclusions Settings')} />}>
          <ExclusionEditor
            label="Excluded folders"
            items={exclusions.folders}
            placeholder="Add folder path"
            iconInput={(item) => item}
            onChange={(items) => updateExclusionsState({ ...exclusions, folders: items })}
          />
          <ExclusionEditor
            label="Excluded project names"
            items={exclusions.projectNames}
            placeholder="Add project name"
            onChange={(items) => updateExclusionsState({ ...exclusions, projectNames: items })}
          />
          <ExclusionEditor
            label="Excluded workspace patterns"
            items={exclusions.workspacePatterns}
            placeholder="Add workspace pattern"
            onChange={(items) => updateExclusionsState({ ...exclusions, workspacePatterns: items })}
          />
          <ExclusionEditor
            label="Excluded file extensions"
            items={exclusions.fileExtensions}
            placeholder="Add file extension"
            iconInput={(item) => `example${item.startsWith('.') ? item : `.${item}`}`}
            onChange={(items) => updateExclusionsState({ ...exclusions, fileExtensions: items })}
          />
          <ExclusionEditor
            label="Excluded machines"
            items={exclusions.machineNames}
            placeholder="Add machine name"
            onChange={(items) => updateExclusionsState({ ...exclusions, machineNames: items })}
          />
        </SettingsSection>
      ),
    },
    {
      label: 'VS Code Extension',
      value: 'extension',
      content: (
        <div className="space-y-3">
          <SettingsSection title="VS Code Extension" action={<ResetButton onClick={() => void handleResetSection(settingsSections.extension, 'VS Code Extension Settings')} />}>
            <SettingsStatusPanel
              title="Extension status"
              status={
                !vscodeExtension.extensionInstalled
                  ? 'inactive'
                  : vscodeExtension.extensionConnected
                    ? 'healthy'
                    : 'offline'
              }
              rows={[
                { label: 'Installed', value: vscodeExtension.extensionInstalled ? 'Yes' : 'No' },
                { label: 'Connected', value: vscodeExtension.extensionConnected ? 'Yes' : 'No' },
                { label: 'Bridge reachable', value: bridgeReachable === null ? 'Checking…' : (bridgeReachable ? 'Reachable' : 'Unreachable') },
                { label: 'Editor detected', value: vscodeExtension.editorDetected },
                { label: 'Extension version', value: vscodeExtension.extensionVersion },
                { label: 'Last extension sync', value: vscodeExtension.lastExtensionSync },
                { label: 'Last extension event', value: vscodeExtension.lastExtensionEvent },
              ]}
              action={
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full!"
                    onClick={() => {
                      void (async () => {
                        try {
                          const status = await refreshVSCodeExtensionStatus();
                          await reloadSettings({ silent: true });
                          setBridgeReachable(true);
                          success('Extension Status', status.connected
                            ? 'VS Code extension responded and status was refreshed.'
                            : 'Refresh completed, but extension remains offline.');
                        } catch (cause) {
                          setBridgeReachable(false);
                          error(
                            'Extension Status',
                            cause instanceof Error ? cause.message : 'Unable to refresh VS Code extension status.',
                          );
                        }
                      })();
                    }}
                  >
                    Refresh Status
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full! border-black/10"
                    onClick={() => {
                      void (async () => {
                        try {
                          const status = await reconnectVSCodeExtension();
                          await reloadSettings({ silent: true });
                          setBridgeReachable(true);
                          success(
                            'VS Code Extension',
                            status.connected
                              ? 'Reconnect succeeded and extension is online.'
                              : 'Reconnect attempted, but extension is still offline.',
                          );
                        } catch (cause) {
                          setBridgeReachable(false);
                          error(
                            'VS Code Extension',
                            cause instanceof Error ? cause.message : 'Unable to reach VS Code extension.',
                          );
                        }
                      })();
                    }}
                  >
                    Reconnect
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full! border-black/10"
                    disabled
                  >
                    View Workspaces
                  </Button>
                </div>
              }
            />
            <SettingsRow label="Auto-connect to desktop app" helper="The extension attempts to connect to the local Kairos desktop server on startup.">
              <SettingsToggle checked={vscodeExtension.autoConnectToDesktop} onChange={(next) => updateExtensionState({ ...vscodeExtension, autoConnectToDesktop: next })} />
            </SettingsRow>
            <SettingsRow label="Send heartbeat events" helper="Allows the extension to emit periodic activity heartbeats while tracking is active.">
              <SettingsToggle checked={vscodeExtension.sendHeartbeatEvents} onChange={(next) => updateExtensionState({ ...vscodeExtension, sendHeartbeatEvents: next })} />
            </SettingsRow>
            <SettingsRow label="Heartbeat interval" helper="Seconds. Controls how often heartbeat events are emitted while the extension is active.">
              <div className="w-full max-w-sm space-y-1">
                <SettingsInput
                  value={heartbeatIntervalDraft}
                  inputMode="numeric"
                  onChange={(event) => {
                    setHeartbeatIntervalDraft(event.target.value);
                  }}
                  onBlur={() => {
                    const trimmed = heartbeatIntervalDraft.trim();
                    const parsed = Number.parseInt(trimmed, 10);
                    if (!Number.isFinite(parsed) || parsed < MIN_HEARTBEAT_INTERVAL_SECONDS) {
                      const minimum = String(MIN_HEARTBEAT_INTERVAL_SECONDS);
                      setHeartbeatIntervalDraft(minimum);
                      if (vscodeExtension.heartbeatIntervalSeconds !== minimum) {
                        updateExtensionState({ ...vscodeExtension, heartbeatIntervalSeconds: minimum });
                      }
                      return;
                    }

                    const normalized = String(parsed);
                    if (normalized !== heartbeatIntervalDraft) {
                      setHeartbeatIntervalDraft(normalized);
                    }
                  }}
                />
                {heartbeatIntervalWarning ? (
                  <p className="text-xs text-[var(--ink-warning)]">{heartbeatIntervalWarning}</p>
                ) : null}
              </div>
            </SettingsRow>
            <SettingsRow label="Send project metadata" helper="Includes project and workspace context in extension events when allowed by privacy settings.">
              <SettingsToggle checked={vscodeExtension.sendProjectMetadata} onChange={(next) => updateExtensionState({ ...vscodeExtension, sendProjectMetadata: next })} />
            </SettingsRow>
            <SettingsRow label="Send language metadata" helper="Includes detected file language in extension events and downstream summaries.">
              <SettingsToggle checked={vscodeExtension.sendLanguageMetadata} onChange={(next) => updateExtensionState({ ...vscodeExtension, sendLanguageMetadata: next })} />
            </SettingsRow>
            <SettingsRow label="Send machine attribution" helper="Includes machine identity in extension payloads when the current contract requires it.">
              <SettingsToggle checked={vscodeExtension.sendMachineAttribution} onChange={(next) => updateExtensionState({ ...vscodeExtension, sendMachineAttribution: next })} />
            </SettingsRow>
            <SettingsRow label="Respect desktop exclusions" helper="Applies desktop-owned project, workspace, folder, and extension exclusions before sending events.">
              <SettingsToggle checked={vscodeExtension.respectDesktopExclusions} onChange={(next) => updateExtensionState({ ...vscodeExtension, respectDesktopExclusions: next })} />
            </SettingsRow>
            <SettingsRow label="Buffer events when desktop is unavailable" helper="Keeps a bounded in-memory queue in the extension until the desktop app reconnects.">
              <SettingsToggle checked={vscodeExtension.bufferEventsWhenOffline} onChange={(next) => updateExtensionState({ ...vscodeExtension, bufferEventsWhenOffline: next })} />
            </SettingsRow>
            <SettingsRow label="Retry connection automatically" helper="Allows the extension to retry the local desktop connection after send or handshake failures.">
              <SettingsToggle checked={vscodeExtension.retryConnectionAutomatically} onChange={(next) => updateExtensionState({ ...vscodeExtension, retryConnectionAutomatically: next })} />
            </SettingsRow>
            <SettingsRow label="Track only focused VS Code window" helper="Suppresses activity when the VS Code window is not focused.">
              <SettingsToggle checked={vscodeExtension.trackFocusedWindowOnly} onChange={(next) => updateExtensionState({ ...vscodeExtension, trackFocusedWindowOnly: next })} />
            </SettingsRow>
            <SettingsRow label="Track file open events" helper="Controls whether opening a file emits an `open` activity event.">
              <SettingsToggle checked={vscodeExtension.trackFileOpenEvents} onChange={(next) => updateExtensionState({ ...vscodeExtension, trackFileOpenEvents: next })} />
            </SettingsRow>
            <SettingsRow label="Track save events" helper="Controls whether saving a file emits a `save` activity event.">
              <SettingsToggle checked={vscodeExtension.trackSaveEvents} onChange={(next) => updateExtensionState({ ...vscodeExtension, trackSaveEvents: next })} />
            </SettingsRow>
            <SettingsRow label="Track edit activity" helper="Only active edits count toward tracked coding time after a file has been active for at least 15 seconds.">
              <SettingsToggle checked={vscodeExtension.trackEditActivity} onChange={(next) => updateExtensionState({ ...vscodeExtension, trackEditActivity: next })} />
            </SettingsRow>
            <SettingsRow label="Sessionization handled by" helper="Sessionization is managed by the desktop app.">
              <SettingsSelect
                value={vscodeExtension.sessionizationOwner}
                onChange={() => {}}
                disabled
                options={[
                  { label: 'Desktop app', value: 'desktop' },
                  { label: 'Extension', value: 'extension' },
                ]}
              />
            </SettingsRow>
          </SettingsSection>
        </div>
      ),
    },
    {
      label: 'Device / System',
      value: 'system',
      content: (
        <div className="space-y-3">
          <SettingsSection title="Device / System">
            <SettingsInfoGrid
              items={[
                { label: 'Machine name', value: currentMachine.machineName },
                { label: 'Machine id', value: currentMachine.machineId, mono: true },
                { label: 'Hostname', value: currentMachine.hostname, mono: true },
                { label: 'Operating system', value: currentMachine.os },
                { label: 'OS version', value: currentMachine.osVersion },
                { label: 'Architecture', value: currentMachine.architecture, mono: true },
                { label: 'Editor', value: currentMachine.editorName },
                { label: 'Editor version', value: currentMachine.editorVersion },
                { label: 'Desktop app version', value: appStatus.appVersion },
                { label: 'Extension version', value: currentMachine.extensionVersion },
                { label: 'Last seen', value: currentMachine.lastSeenAt, mono: true },
                { label: 'Last updated', value: appStatus.lastUpdatedAt, mono: true },
              ]}
            />
          </SettingsSection>
          <SettingsSection title="Status">
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[var(--surface-subtle)] px-3 py-3">
              <StatusBadge status={appStatus.trackingEnabled ? 'enabled' : 'disabled'} />
              <StatusBadge status={appStatus.localOnlyMode ? 'enabled' : 'disabled'} />
              <StatusBadge status={vscodeExtension.extensionConnected ? 'healthy' : 'offline'} />
            </div>
          </SettingsSection>
        </div>
      ),
    },
    {
      label: 'App Behavior',
      value: 'behavior',
      content: (
        <SettingsSection title="App Behavior" action={<ResetButton onClick={() => void handleResetSection(settingsSections.appBehavior, 'App Behavior Settings')} />}>
          <SettingsRow label="Launch on startup" helper="Opens Kairos automatically when your OS starts your user session, where supported.">
            <SettingsToggle
              checked={appBehavior.launchOnStartup}
              onChange={(next) => updateAppBehaviorState({
                ...appBehavior,
                launchOnStartup: next,
                openOnSystemLogin: next,
              })}
            />
          </SettingsRow>
          <SettingsRow label="Start minimized" helper="Starts the desktop window minimized instead of foregrounded.">
            <SettingsToggle checked={appBehavior.startMinimized} onChange={(next) => updateAppBehaviorState({ ...appBehavior, startMinimized: next })} />
          </SettingsRow>
          <SettingsRow label="Minimize to tray" helper="Keeps Kairos running in the background when the window is minimized, where supported.">
            <SettingsToggle checked={appBehavior.minimizeToTray} onChange={(next) => updateAppBehaviorState({ ...appBehavior, minimizeToTray: next })} />
          </SettingsRow>
          <SettingsRow label="Open on system login" helper="Requests OS login-item behavior so Kairos launches after sign-in, where supported.">
            <SettingsToggle
              checked={appBehavior.openOnSystemLogin}
              onChange={(next) => updateAppBehaviorState({
                ...appBehavior,
                launchOnStartup: next,
                openOnSystemLogin: next,
              })}
            />
          </SettingsRow>
          <SettingsRow label="Autostart registration" helper="Detected from your OS startup integration.">
            <div className="rounded-full bg-[var(--surface-chip)] px-3 py-1.5 text-xs font-medium text-[var(--ink-accent)]">
              {autostartRegistrationLabel}
            </div>
          </SettingsRow>
          <SettingsRow label="Remember last selected page" helper="Restores the last desktop page you visited when the app reopens.">
            <SettingsToggle checked={appBehavior.rememberLastSelectedPage} onChange={(next) => updateAppBehaviorState({ ...appBehavior, rememberLastSelectedPage: next })} />
          </SettingsRow>
          <SettingsRow label="Restore last selected date range" helper="Reuses your previous Overview, Sessions, or Analytics date range when reopening the app.">
            <SettingsToggle checked={appBehavior.restoreLastSelectedDateRange} onChange={(next) => updateAppBehaviorState({ ...appBehavior, restoreLastSelectedDateRange: next })} />
          </SettingsRow>
          <SettingsRow label="Reopen last viewed calendar month or analytics filters" helper="Restore your last calendar month and analytics filter state.">
            <SettingsToggle
              checked={appBehavior.reopenLastViewedContext}
              onChange={() => {}}
              disabled
            />
          </SettingsRow>
        </SettingsSection>
      ),
    },
    {
      label: 'Data & Storage',
      value: 'storage',
      content: (
        <div className="space-y-3">
          <SettingsSection title="Data & Storage">
            <SettingsInfoGrid
              items={[
                {
                  label: 'Local storage path',
                  value: dataStorage.localStoragePath ? OBFUSCATED_STORAGE_PATH_LABEL : 'Unavailable',
                  mono: true,
                  icon: <KairosFileIcon filename="hidden" size={16} />,
                },
                { label: 'Database status', value: dataStorage.databaseStatus },
                { label: 'Last processed time', value: dataStorage.lastProcessedTime, mono: true },
                { label: 'Analytics cache', value: dataStorage.analyticsCacheStatus },
                { label: 'Extension event queue', value: dataStorage.extensionQueueStatus },
                { label: 'Pending event count', value: `${dataStorage.pendingEventCount}`, mono: true },
              ]}
            />
          </SettingsSection>
          <SettingsSection title="Actions">
            <SettingsActionRow
              label="Local data"
              actions={
                <>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="rounded-full! border-[var(--destructive)] text-[var(--destructive)] hover:bg-[var(--destructive-muted)] hover:text-[var(--destructive)]">
                        Clear Local Data
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-[20px]!">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action is <strong>irreversible</strong>. It will permanently delete your local tracking history from the database. Make sure you have exported your data as a backup if you wish to keep a copy.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full!">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-[var(--destructive)] text-white hover:bg-[var(--destructive)]/90 rounded-full!"
                          onClick={() => {
                            void (async () => {
                              try {
                                await ClearLocalData();
                                success('Data Cleared', 'Your local tracking history has been permanently deleted.');
                              } catch (err: unknown) {
                                error('Clear Data Failed', err instanceof Error ? err.message : String(err));
                              }
                            })();
                          }}
                        >
                          Yes, delete data
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button variant="outline" size="sm" className="rounded-full! border-black/10" disabled>
                    Export Data
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full! border-black/10" disabled>
                    Import Data
                  </Button>
                </>
              }
            />
            <SettingsActionRow
              label="Processing"
              actions={
                <Button variant="secondary" size="sm" className="rounded-full!" disabled>
                  Rebuild Analytics Cache
                </Button>
              }
            />
          </SettingsSection>
        </div>
      ),
    },
    {
      label: 'About',
      value: 'about',
      content: (
        <div className="space-y-3">
          <SettingsSection title="About">
            <SettingsInfoGrid
              items={[
                { label: 'App name', value: about.appName },
                { label: 'Version', value: about.version },
                { label: 'Environment', value: about.environment },
                { label: 'Build channel', value: about.buildChannel },
                { label: 'Desktop app version', value: about.desktopAppVersion },
                { label: 'VS Code extension version', value: about.extensionVersion },
                { label: 'License', value: about.licenseSummary },
                { label: 'Repository', value: about.repositoryLabel },
                { label: 'Release notes', value: about.releaseNotesLabel },
                { label: 'Update status', value: updateStatusLabel },
                { label: 'Latest version', value: latestVersionLabel },
                { label: 'Last update check', value: updateCheckedAtLabel, mono: true },
              ]}
            />
          </SettingsSection>
          <SettingsActionRow
            label="Update"
            actions={
              <>
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full!"
                  onClick={() => {
                    void (async () => {
                      const status = await checkDesktopUpdate();
                      if (!status) {
                        setUpdateStatusLabel('Unavailable');
                        return;
                      }

                      const checkedAt = status.checkedAt ? new Date(status.checkedAt) : null;
                      setUpdateCheckedAtLabel(
                        checkedAt && !Number.isNaN(checkedAt.getTime())
                          ? checkedAt.toLocaleString()
                          : '—',
                      );
                      setLatestVersionLabel(status.latestVersion || '—');
                      setUpdateReleaseUrl(status.releaseUrl || status.assetUrl || '');
                      if (status.error) {
                        setUpdateStatusLabel('Check failed');
                        error('Update Check', status.error);
                        return;
                      }
                      setUpdateStatusLabel(status.updateAvailable ? 'Update available' : 'Up to date');
                      success('Update Check', status.updateAvailable ? 'A newer Kairos release is available.' : 'You are on the latest release.');
                    })();
                  }}
                >
                  Check Updates
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full! border-black/10"
                  onClick={() => {
                    BrowserOpenURL(updateReleaseUrl);
                  }}
                  disabled={updateReleaseUrl.length === 0}
                >
                  Download Update
                </Button>
              </>
            }
          />
          <SettingsActionRow
            label="Links"
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full! border-black/10"
                  onClick={() => {
                    BrowserOpenURL(about.repositoryLabel);
                  }}
                  disabled={!canOpenRepository}
                >
                  Open Repository
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full! border-black/10"
                  onClick={() => {
                    BrowserOpenURL(about.releaseNotesLabel);
                  }}
                  disabled={!canOpenReleaseNotes}
                >
                  View Release Notes
                </Button>
              </>
            }
          />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <section className="flex items-center justify-between rounded-[16px] bg-[var(--surface-strong)] p-3">
        <h1 className="text-2xl font-semibold text-[var(--ink-strong)]">Settings</h1>
        <Button
          variant="outline"
          size="sm"
          className="rounded-full! border-black/10"
          onClick={() => {
            void (async () => {
              try {
                for (const section of Object.values(settingsSections)) {
                  await resetSettingsSectionViewModel(section);
                }
                await reloadSettings();
                setActiveTab('general');
                success('Settings Reset', 'All persisted settings returned to desktop defaults.');
              } catch (cause) {
                error('Settings Reset Failed', cause instanceof Error ? cause.message : 'Unable to reset settings.');
              }
            })();
          }}
        >
          <RotateCcw size={14} />
          Reset All
        </Button>
      </section>

      <section className="rounded-[16px] bg-[var(--surface)] p-3">
        {loadError ? (
          <div className="mb-3 rounded-[14px] bg-[var(--surface-muted)] px-3 py-2 text-sm text-[var(--ink-tertiary)]">
            {loadError}
          </div>
        ) : null}
        {isInitialLoading && !loadError ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-24 rounded-full" />
            </div>
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : (
          <VercelTabs
            tabs={tabs}
            defaultTab="general"
            value={activeTab}
            onValueChange={setActiveTab}
            className="items-start"
            stickyTabList
          />
        )}
      </section>
    </div>
  );
}
