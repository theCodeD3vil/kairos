import type { RuntimeStatusSnapshot } from './runtime/types';

export type StatusBarAction = 'open-desktop' | 'refresh-settings' | 'reconnect-desktop' | 'show-status' | 'show-output';

export type StatusBarActionItem = {
  action: StatusBarAction;
  label: string;
  description?: string;
};

export function buildStatusBarText(snapshot: RuntimeStatusSnapshot): string {
  return `$(code) ${formatDuration(snapshot.todayTrackedMinutes)}`;
}

export function buildStatusBarTooltip(snapshot: RuntimeStatusSnapshot): string {
  const lines = [
    '$(code) **Kairos Coding Session**',
    '',
    `- $(clock) Today: **${formatDuration(snapshot.todayTrackedMinutes)}**`,
    `- $(pulse) Current session: **${formatDuration(snapshot.currentSessionMinutes)}**`,
    `- $(circle-large-filled) Session: **${describeSessionState(snapshot)}**`,
  ];

  if (snapshot.currentSessionStartedAt) {
    lines.push(`- $(play) Started: **${formatTimestamp(snapshot.currentSessionStartedAt)}**`);
  }

  if (snapshot.currentSessionLastActivityAt) {
    lines.push(`- $(history) Last activity: **${formatTimestamp(snapshot.currentSessionLastActivityAt)}**`);
  }

  if (snapshot.activeFilePath) {
    lines.push(`- $(file-code) File: **${escapeMarkdown(toDisplayFilePath(snapshot.activeFilePath))}**`);
  }

  if (snapshot.activeLanguage) {
    lines.push(`- $(symbol-key) Language: **${escapeMarkdown(snapshot.activeLanguage)}**`);
  }

  if (snapshot.trackOnlyWhenFocused && !snapshot.focused) {
    lines.push('- $(eye-closed) Focus tracking is enabled and VS Code is unfocused');
  }

  if (!snapshot.trackingEnabled) {
    lines.push('- $(circle-slash) Tracking is disabled in desktop settings');
  }

  return lines.join('\n');
}

export function buildStatusSummary(snapshot: RuntimeStatusSnapshot): string {
  const parts = [
    `Today ${formatDuration(snapshot.todayTrackedMinutes)}`,
    `Session ${formatDuration(snapshot.currentSessionMinutes)}`,
    describeSessionState(snapshot),
  ];

  if (snapshot.activeLanguage) {
    parts.push(snapshot.activeLanguage);
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

function describeSessionState(snapshot: RuntimeStatusSnapshot): string {
  if (!snapshot.trackingEnabled) {
    return 'Tracking off';
  }

  if (snapshot.currentSessionActive) {
    return 'Live';
  }

  if (snapshot.currentSessionMinutes > 0) {
    return 'Paused';
  }

  return 'Waiting for activity';
}

function formatTimestamp(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return escapeMarkdown(value);
  }

  return escapeMarkdown(parsed.toLocaleString());
}

function toDisplayFilePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const segments = normalized.split('/').filter(Boolean);
  if (segments.length <= 2) {
    return normalized;
  }

  return `.../${segments.slice(-2).join('/')}`;
}

function escapeMarkdown(value: string): string {
  return value.replace(/[\\`*_{}[\]()#+\-.!]/g, '\\$&');
}
