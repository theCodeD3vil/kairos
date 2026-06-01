import type { EditorIntegrationStatus } from '@/data/mockSettings';
import { StatusBadge, type StatusBadgeStatus } from '@/components/ui/status-badge';

const RECENT_ACTIVITY_MS = 5 * 60 * 1000;

function isRecentlyActive(rawTimestamp?: string): boolean {
  if (!rawTimestamp) return false;
  const ts = Date.parse(rawTimestamp);
  return !Number.isNaN(ts) && Date.now() - ts < RECENT_ACTIVITY_MS;
}

function toIntegrationStatus(status: EditorIntegrationStatus): StatusBadgeStatus {
  if (!status.installed) return 'inactive';
  if (status.connected) return 'healthy';
  if (isRecentlyActive(status.lastEventAtRaw)) return 'healthy';
  return 'offline';
}

function connectionLabel(status: EditorIntegrationStatus): string {
  if (status.connected) return 'Connected';
  if (isRecentlyActive(status.lastEventAtRaw)) return 'Active';
  return 'Disconnected';
}

export function EditorIntegrationStatusList({
  integrations,
}: {
  integrations: EditorIntegrationStatus[];
}) {
  if (!integrations.length) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2 md:grid-cols-2">
      {integrations.map((integration) => (
        <div key={integration.editor} className="rounded-lg bg-[var(--surface-subtle)] px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-[var(--ink-strong)]">{integration.label}</p>
            <StatusBadge status={toIntegrationStatus(integration)} />
          </div>
          <div className="mt-2 grid gap-2 text-xs text-[var(--ink-tertiary)] sm:grid-cols-2">
            <span>Version {integration.extensionVersion}</span>
            <span>Sync {integration.lastExtensionSync}</span>
            <span>Event {integration.lastExtensionEvent}</span>
            <span>{connectionLabel(integration)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
