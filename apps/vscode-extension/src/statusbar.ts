import type { RuntimeStatusSnapshot } from './runtime/types';

export type StatusBarAction = 'open-desktop' | 'refresh-settings' | 'reconnect-desktop' | 'show-status' | 'show-output';

export type StatusBarActionItem = {
  action: StatusBarAction;
  label: string;
  description?: string;
};

export function buildStatusBarText(snapshot: RuntimeStatusSnapshot): string {
  switch (snapshot.displayState) {
    case 'active':
      return `Kairos: ${formatDuration(snapshot.todayTrackedMinutes)} today`;
    case 'tracking-disabled':
      return 'Kairos: Tracking off';
    case 'buffering':
      return 'Kairos: Buffering';
    case 'connecting':
      return 'Kairos: Connecting';
    case 'retrying':
      return 'Kairos: Reconnecting';
    case 'disconnected':
      return 'Kairos: Disconnected';
    case 'idle':
    default:
      return 'Kairos: Idle';
  }
}

export function buildStatusBarTooltip(snapshot: RuntimeStatusSnapshot): string {
  const lines = [
    '$(pulse) **Kairos**',
    '',
    `- Today: **${formatDuration(snapshot.todayTrackedMinutes)}**`,
    `- State: **${describeDisplayState(snapshot)}**`,
    `- Connection: **${describeConnectionState(snapshot)}**`,
    `- Tracking: **${snapshot.trackingEnabled ? 'Enabled' : 'Disabled'}**`,
  ];

  if (snapshot.queueSize > 0 || snapshot.displayState === 'buffering') {
    lines.push(`- Buffered events: **${snapshot.queueSize}**`);
  }

  lines.push(`- Machine: **${escapeMarkdown(snapshot.machineName)}**`);

  if (snapshot.extensionVersion) {
    lines.push(`- Extension version: **${escapeMarkdown(snapshot.extensionVersion)}**`);
  }

  if (snapshot.lastHandshakeAt) {
    lines.push(`- Last handshake: **${formatTimestamp(snapshot.lastHandshakeAt)}**`);
  }

  if (snapshot.lastSuccessfulSendAt) {
    lines.push(`- Last successful send: **${formatTimestamp(snapshot.lastSuccessfulSendAt)}**`);
  }

  if (snapshot.lastEventAt) {
    lines.push(`- Last event: **${formatTimestamp(snapshot.lastEventAt)}**`);
  }

  lines.push(`- File path mode: **${snapshot.filePathMode}**`);
  lines.push(`- Heartbeat interval: **${snapshot.heartbeatIntervalSeconds}s**`);
  lines.push(`- Focus-only tracking: **${snapshot.trackOnlyWhenFocused ? 'On' : 'Off'}**`);

  return lines.join('\n');
}

export function buildStatusSummary(snapshot: RuntimeStatusSnapshot): string {
  const parts = [
    `Today ${formatDuration(snapshot.todayTrackedMinutes)}`,
    describeDisplayState(snapshot),
    describeConnectionState(snapshot),
  ];

  if (snapshot.queueSize > 0) {
    parts.push(`${snapshot.queueSize} buffered`);
  }

  return parts.join(' • ');
}

export function getStatusBarActions(snapshot: RuntimeStatusSnapshot): StatusBarActionItem[] {
  const actions: StatusBarActionItem[] = [];

  if (snapshot.connectionState === 'disconnected' || snapshot.connectionState === 'retrying') {
    actions.push({
      action: 'reconnect-desktop',
      label: 'Reconnect to Kairos Desktop',
      description: 'Retry the local desktop handshake immediately.',
    });
  }

  actions.push({
    action: 'refresh-settings',
    label: 'Refresh Kairos Settings',
    description: 'Fetch the latest effective settings from the desktop app.',
  });
  actions.push({
    action: 'open-desktop',
    label: 'Open Kairos Desktop',
    description: 'Launch or focus the local Kairos desktop app if available.',
  });
  actions.push({
    action: 'show-status',
    label: 'Show Kairos Status',
    description: 'Show a concise runtime status summary.',
  });
  actions.push({
    action: 'show-output',
    label: 'Show Kairos Output',
    description: 'Open the Kairos output channel for runtime logs.',
  });

  return actions;
}

export function formatDuration(minutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(minutes));
  if (safeMinutes < 60) {
    return `${safeMinutes}m`;
  }

  const hours = Math.floor(safeMinutes / 60);
  const remainingMinutes = safeMinutes % 60;
  return `${hours}h ${String(remainingMinutes).padStart(2, '0')}m`;
}

function describeDisplayState(snapshot: RuntimeStatusSnapshot): string {
  switch (snapshot.displayState) {
    case 'active':
      return 'Active';
    case 'tracking-disabled':
      return 'Tracking disabled';
    case 'buffering':
      return 'Offline buffering';
    case 'connecting':
      return 'Connecting';
    case 'retrying':
      return 'Retrying';
    case 'disconnected':
      return 'Disconnected';
    case 'idle':
    default:
      return snapshot.trackOnlyWhenFocused && !snapshot.focused ? 'Idle (window unfocused)' : 'Idle';
  }
}

function describeConnectionState(snapshot: RuntimeStatusSnapshot): string {
  switch (snapshot.connectionState) {
    case 'connected':
      return 'Connected';
    case 'connecting':
      return 'Connecting';
    case 'retrying':
      return 'Retrying';
    case 'offline-buffering':
      return snapshot.bufferingEnabled ? 'Buffering offline' : 'Unavailable';
    case 'disconnected':
    default:
      return 'Disconnected';
  }
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return escapeMarkdown(value);
  }

  return escapeMarkdown(parsed.toLocaleString());
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
}
