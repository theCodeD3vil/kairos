import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useToast } from '@/components/toast/ToastProvider';
import { VercelTabs } from '@/components/ui/vercel-tabs';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
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
import { settingsDefaults, settingsTabOrder } from '@/data/mockSettings';
import { systemInfoSnapshot } from '@/mocks/system-info';

export function SettingsPage() {
  const { info, success } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [general, setGeneral] = useState(settingsDefaults.general);
  const [privacy, setPrivacy] = useState(settingsDefaults.privacy);
  const [tracking, setTracking] = useState(settingsDefaults.tracking);
  const [exclusions, setExclusions] = useState(settingsDefaults.exclusions);
  const [vscodeExtension, setVscodeExtension] = useState(settingsDefaults.vscodeExtension);
  const [appBehavior, setAppBehavior] = useState(settingsDefaults.appBehavior);
  const [dataStorage] = useState(settingsDefaults.dataStorage);
  const [about] = useState(settingsDefaults.about);

  const { currentMachine, appStatus } = systemInfoSnapshot;

  const placeholderAction = (title: string, body: string) => {
    info(title, body);
  };

  const tabs = [
    {
      label: 'General',
      value: 'general',
      content: (
        <SettingsSection title="General" action={<ResetButton onClick={() => setGeneral(settingsDefaults.general)} />}>
          <SettingsRow label="Machine display name">
            <SettingsInput
              value={general.machineDisplayName}
              onChange={(event) => setGeneral({ ...general, machineDisplayName: event.target.value })}
            />
          </SettingsRow>
          <SettingsRow label="Default date range">
            <SettingsSelect
              value={general.defaultDateRange}
              onChange={(event) => setGeneral({ ...general, defaultDateRange: event.target.value as typeof general.defaultDateRange })}
              options={[
                { label: 'Today', value: 'today' },
                { label: 'Last 7 days', value: 'week' },
                { label: 'This month', value: 'month' },
                { label: 'Custom', value: 'custom' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Time format">
            <SettingsSelect
              value={general.timeFormat}
              onChange={(event) => setGeneral({ ...general, timeFormat: event.target.value as typeof general.timeFormat })}
              options={[
                { label: '24 hour', value: '24h' },
                { label: '12 hour', value: '12h' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Week start day">
            <SettingsSelect
              value={general.weekStartDay}
              onChange={(event) => setGeneral({ ...general, weekStartDay: event.target.value as typeof general.weekStartDay })}
              options={[
                { label: 'Monday', value: 'Monday' },
                { label: 'Sunday', value: 'Sunday' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Preferred landing page">
            <SettingsSelect
              value={general.landingPage}
              onChange={(event) => setGeneral({ ...general, landingPage: event.target.value as typeof general.landingPage })}
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
        <SettingsSection title="Privacy" action={<ResetButton onClick={() => setPrivacy(settingsDefaults.privacy)} />}>
          <SettingsRow label="Local-only mode">
            <SettingsToggle checked={privacy.localOnlyMode} onChange={(next) => setPrivacy({ ...privacy, localOnlyMode: next })} />
          </SettingsRow>
          <SettingsRow label="Cloud sync" helper="Placeholder only">
            <SettingsToggle checked={privacy.cloudSyncEnabled} onChange={(next) => setPrivacy({ ...privacy, cloudSyncEnabled: next })} />
          </SettingsRow>
          <SettingsRow label="File path visibility">
            <SettingsSelect
              value={privacy.filePathVisibility}
              onChange={(event) => setPrivacy({ ...privacy, filePathVisibility: event.target.value as typeof privacy.filePathVisibility })}
              options={[
                { label: 'Masked', value: 'masked' },
                { label: 'Full path', value: 'full' },
                { label: 'Hidden', value: 'hidden' },
              ]}
            />
          </SettingsRow>
          <SettingsRow label="Show machine names">
            <SettingsToggle checked={privacy.showMachineNames} onChange={(next) => setPrivacy({ ...privacy, showMachineNames: next })} />
          </SettingsRow>
          <SettingsRow label="Show hostname">
            <SettingsToggle checked={privacy.showHostname} onChange={(next) => setPrivacy({ ...privacy, showHostname: next })} />
          </SettingsRow>
          <SettingsRow label="Obfuscate sensitive project names">
            <SettingsToggle checked={privacy.obfuscateSensitiveProjects} onChange={(next) => setPrivacy({ ...privacy, obfuscateSensitiveProjects: next })} />
          </SettingsRow>
          <SettingsRow label="Minimize extension metadata">
            <SettingsToggle checked={privacy.minimizeExtensionMetadata} onChange={(next) => setPrivacy({ ...privacy, minimizeExtensionMetadata: next })} />
          </SettingsRow>
        </SettingsSection>
      ),
    },
    {
      label: 'Tracking',
      value: 'tracking',
      content: (
        <SettingsSection title="Tracking" action={<ResetButton onClick={() => setTracking(settingsDefaults.tracking)} />}>
          <SettingsRow label="Tracking enabled">
            <SettingsToggle checked={tracking.trackingEnabled} onChange={(next) => setTracking({ ...tracking, trackingEnabled: next })} />
          </SettingsRow>
          <SettingsRow label="Idle detection">
            <SettingsToggle checked={tracking.idleDetectionEnabled} onChange={(next) => setTracking({ ...tracking, idleDetectionEnabled: next })} />
          </SettingsRow>
          <SettingsRow label="Track project activity">
            <SettingsToggle checked={tracking.trackProjectActivity} onChange={(next) => setTracking({ ...tracking, trackProjectActivity: next })} />
          </SettingsRow>
          <SettingsRow label="Track language activity">
            <SettingsToggle checked={tracking.trackLanguageActivity} onChange={(next) => setTracking({ ...tracking, trackLanguageActivity: next })} />
          </SettingsRow>
          <SettingsRow label="Track machine attribution">
            <SettingsToggle checked={tracking.trackMachineAttribution} onChange={(next) => setTracking({ ...tracking, trackMachineAttribution: next })} />
          </SettingsRow>
          <SettingsRow label="Track session boundaries">
            <SettingsToggle checked={tracking.trackSessionBoundaries} onChange={(next) => setTracking({ ...tracking, trackSessionBoundaries: next })} />
          </SettingsRow>
          <SettingsRow label="Idle timeout threshold">
            <SettingsInput
              value={tracking.idleTimeoutMinutes}
              onChange={(event) => setTracking({ ...tracking, idleTimeoutMinutes: event.target.value })}
            />
          </SettingsRow>
          <SettingsRow label="Session merge threshold">
            <SettingsInput
              value={tracking.sessionMergeThresholdMinutes}
              onChange={(event) => setTracking({ ...tracking, sessionMergeThresholdMinutes: event.target.value })}
            />
          </SettingsRow>
          <SettingsRow label="Detect active coding window">
            <SettingsToggle checked={tracking.detectActiveCodingWindow} onChange={(next) => setTracking({ ...tracking, detectActiveCodingWindow: next })} />
          </SettingsRow>
          <SettingsRow label="Background activity capture" helper="Placeholder only">
            <SettingsToggle checked={tracking.backgroundActivityCapture} onChange={(next) => setTracking({ ...tracking, backgroundActivityCapture: next })} />
          </SettingsRow>
        </SettingsSection>
      ),
    },
    {
      label: 'Exclusions',
      value: 'exclusions',
      content: (
        <SettingsSection title="Exclusions" action={<ResetButton onClick={() => setExclusions(settingsDefaults.exclusions)} />}>
          <ExclusionEditor
            label="Excluded folders"
            items={exclusions.folders}
            placeholder="Add folder path"
            onChange={(items) => setExclusions({ ...exclusions, folders: items })}
          />
          <ExclusionEditor
            label="Excluded project names"
            items={exclusions.projectNames}
            placeholder="Add project name"
            onChange={(items) => setExclusions({ ...exclusions, projectNames: items })}
          />
          <ExclusionEditor
            label="Excluded workspace patterns"
            items={exclusions.workspacePatterns}
            placeholder="Add workspace pattern"
            onChange={(items) => setExclusions({ ...exclusions, workspacePatterns: items })}
          />
          <ExclusionEditor
            label="Excluded file extensions"
            items={exclusions.fileExtensions}
            placeholder="Add file extension"
            onChange={(items) => setExclusions({ ...exclusions, fileExtensions: items })}
          />
          <ExclusionEditor
            label="Excluded machines"
            items={exclusions.machineNames}
            placeholder="Add machine name"
            onChange={(items) => setExclusions({ ...exclusions, machineNames: items })}
          />
        </SettingsSection>
      ),
    },
    {
      label: 'VS Code Extension',
      value: 'extension',
      content: (
        <div className="space-y-3">
          <SettingsSection title="VS Code Extension" action={<ResetButton onClick={() => setVscodeExtension(settingsDefaults.vscodeExtension)} />}>
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
                      setVscodeExtension({ ...vscodeExtension, extensionConnected: true, lastExtensionSync: 'Just now' });
                      success('Extension Connection', 'Mock connection established.');
                    }}
                  >
                    Test Connection
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full! border-black/10"
                    onClick={() => placeholderAction('Reconnect Extension', 'Reconnect is a frontend placeholder.')}
                  >
                    Reconnect
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-full! border-black/10"
                    onClick={() => placeholderAction('Detected Workspaces', 'Workspace discovery is not wired yet.')}
                  >
                    View Workspaces
                  </Button>
                </div>
              }
            />
            <SettingsRow label="Auto-connect to desktop app">
              <SettingsToggle checked={vscodeExtension.autoConnectToDesktop} onChange={(next) => setVscodeExtension({ ...vscodeExtension, autoConnectToDesktop: next })} />
            </SettingsRow>
            <SettingsRow label="Send heartbeat events">
              <SettingsToggle checked={vscodeExtension.sendHeartbeatEvents} onChange={(next) => setVscodeExtension({ ...vscodeExtension, sendHeartbeatEvents: next })} />
            </SettingsRow>
            <SettingsRow label="Heartbeat interval">
              <SettingsInput
                value={vscodeExtension.heartbeatIntervalSeconds}
                onChange={(event) => setVscodeExtension({ ...vscodeExtension, heartbeatIntervalSeconds: event.target.value })}
              />
            </SettingsRow>
            <SettingsRow label="Send project metadata">
              <SettingsToggle checked={vscodeExtension.sendProjectMetadata} onChange={(next) => setVscodeExtension({ ...vscodeExtension, sendProjectMetadata: next })} />
            </SettingsRow>
            <SettingsRow label="Send language metadata">
              <SettingsToggle checked={vscodeExtension.sendLanguageMetadata} onChange={(next) => setVscodeExtension({ ...vscodeExtension, sendLanguageMetadata: next })} />
            </SettingsRow>
            <SettingsRow label="Send machine attribution">
              <SettingsToggle checked={vscodeExtension.sendMachineAttribution} onChange={(next) => setVscodeExtension({ ...vscodeExtension, sendMachineAttribution: next })} />
            </SettingsRow>
            <SettingsRow label="Respect desktop exclusions">
              <SettingsToggle checked={vscodeExtension.respectDesktopExclusions} onChange={(next) => setVscodeExtension({ ...vscodeExtension, respectDesktopExclusions: next })} />
            </SettingsRow>
            <SettingsRow label="Buffer events when desktop is unavailable">
              <SettingsToggle checked={vscodeExtension.bufferEventsWhenOffline} onChange={(next) => setVscodeExtension({ ...vscodeExtension, bufferEventsWhenOffline: next })} />
            </SettingsRow>
            <SettingsRow label="Retry connection automatically">
              <SettingsToggle checked={vscodeExtension.retryConnectionAutomatically} onChange={(next) => setVscodeExtension({ ...vscodeExtension, retryConnectionAutomatically: next })} />
            </SettingsRow>
            <SettingsRow label="Track only focused VS Code window">
              <SettingsToggle checked={vscodeExtension.trackFocusedWindowOnly} onChange={(next) => setVscodeExtension({ ...vscodeExtension, trackFocusedWindowOnly: next })} />
            </SettingsRow>
            <SettingsRow label="Track file open events">
              <SettingsToggle checked={vscodeExtension.trackFileOpenEvents} onChange={(next) => setVscodeExtension({ ...vscodeExtension, trackFileOpenEvents: next })} />
            </SettingsRow>
            <SettingsRow label="Track save events">
              <SettingsToggle checked={vscodeExtension.trackSaveEvents} onChange={(next) => setVscodeExtension({ ...vscodeExtension, trackSaveEvents: next })} />
            </SettingsRow>
            <SettingsRow label="Track edit activity">
              <SettingsToggle checked={vscodeExtension.trackEditActivity} onChange={(next) => setVscodeExtension({ ...vscodeExtension, trackEditActivity: next })} />
            </SettingsRow>
            <SettingsRow label="Sessionization handled by">
              <SettingsSelect
                value={vscodeExtension.sessionizationOwner}
                onChange={(event) => setVscodeExtension({ ...vscodeExtension, sessionizationOwner: event.target.value as typeof vscodeExtension.sessionizationOwner })}
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
        <SettingsSection title="App Behavior" action={<ResetButton onClick={() => setAppBehavior(settingsDefaults.appBehavior)} />}>
          <SettingsRow label="Launch on startup">
            <SettingsToggle checked={appBehavior.launchOnStartup} onChange={(next) => setAppBehavior({ ...appBehavior, launchOnStartup: next })} />
          </SettingsRow>
          <SettingsRow label="Start minimized">
            <SettingsToggle checked={appBehavior.startMinimized} onChange={(next) => setAppBehavior({ ...appBehavior, startMinimized: next })} />
          </SettingsRow>
          <SettingsRow label="Minimize to tray">
            <SettingsToggle checked={appBehavior.minimizeToTray} onChange={(next) => setAppBehavior({ ...appBehavior, minimizeToTray: next })} />
          </SettingsRow>
          <SettingsRow label="Open on system login">
            <SettingsToggle checked={appBehavior.openOnSystemLogin} onChange={(next) => setAppBehavior({ ...appBehavior, openOnSystemLogin: next })} />
          </SettingsRow>
          <SettingsRow label="Remember last selected page">
            <SettingsToggle checked={appBehavior.rememberLastSelectedPage} onChange={(next) => setAppBehavior({ ...appBehavior, rememberLastSelectedPage: next })} />
          </SettingsRow>
          <SettingsRow label="Restore last selected date range">
            <SettingsToggle checked={appBehavior.restoreLastSelectedDateRange} onChange={(next) => setAppBehavior({ ...appBehavior, restoreLastSelectedDateRange: next })} />
          </SettingsRow>
          <SettingsRow label="Reopen last viewed calendar month or analytics filters">
            <SettingsToggle checked={appBehavior.reopenLastViewedContext} onChange={(next) => setAppBehavior({ ...appBehavior, reopenLastViewedContext: next })} />
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
                { label: 'Local storage path', value: dataStorage.localStoragePath, mono: true },
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
                  <Button variant="outline" size="sm" className="rounded-full! border-black/10" onClick={() => placeholderAction('Clear Local Data', 'Local data clearing is not wired yet.')}>
                    Clear Local Data
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full! border-black/10" onClick={() => placeholderAction('Export Data', 'Export is a placeholder action.')}>
                    Export Data
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full! border-black/10" onClick={() => placeholderAction('Import Data', 'Import is a placeholder action.')}>
                    Import Data
                  </Button>
                </>
              }
            />
            <SettingsActionRow
              label="Processing"
              actions={
                <Button variant="secondary" size="sm" className="rounded-full!" onClick={() => placeholderAction('Rebuild Analytics Cache', 'Cache rebuild will be wired later.')}>
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
              ]}
            />
          </SettingsSection>
          <SettingsActionRow
            label="Placeholder actions"
            actions={
              <>
                <Button variant="outline" size="sm" className="rounded-full! border-black/10" onClick={() => placeholderAction('Repository', 'Repository linking is not wired yet.')}>
                  Open Repository
                </Button>
                <Button variant="outline" size="sm" className="rounded-full! border-black/10" onClick={() => placeholderAction('Release Notes', 'Release notes are not wired yet.')}>
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
            setGeneral(settingsDefaults.general);
            setPrivacy(settingsDefaults.privacy);
            setTracking(settingsDefaults.tracking);
            setExclusions(settingsDefaults.exclusions);
            setVscodeExtension(settingsDefaults.vscodeExtension);
            setAppBehavior(settingsDefaults.appBehavior);
            setActiveTab('general');
            success('Settings Reset', 'All frontend-only settings returned to defaults.');
          }}
        >
          <RotateCcw size={14} />
          Reset All
        </Button>
      </section>

      <section className="rounded-[16px] bg-[var(--surface)] p-3">
        <VercelTabs
          tabs={tabs}
          defaultTab="general"
          value={activeTab}
          onValueChange={setActiveTab}
          className="items-start"
          stickyTabList
        />
      </section>
    </div>
  );
}
