import { cn } from '@/lib/utils';

export type StatusBadgeStatus =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'healthy'
  | 'degraded'
  | 'offline'
  | 'enabled'
  | 'disabled';

const statusStyles = {
  active: {
    container: 'bg-green-500/20 text-green-700 border-green-500/35',
    dot: 'bg-green-500',
    label: 'Active',
  },
  inactive: {
    container: 'bg-red-500/20 text-red-700 border-red-500/35',
    dot: 'bg-red-500',
    label: 'Inactive',
  },
  pending: {
    container: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/35',
    dot: 'bg-yellow-500',
    label: 'Pending',
  },
} as const;

function normalizeStatus(status: StatusBadgeStatus): keyof typeof statusStyles {
  if (status === 'active' || status === 'healthy' || status === 'enabled') return 'active';
  if (status === 'inactive' || status === 'offline' || status === 'disabled') return 'inactive';
  return 'pending';
}

function toLabel(status: StatusBadgeStatus) {
  if (status === 'healthy') return 'Healthy';
  if (status === 'degraded') return 'Degraded';
  if (status === 'offline') return 'Offline';
  if (status === 'enabled') return 'Enabled';
  if (status === 'disabled') return 'Disabled';
  if (status === 'active') return 'Active';
  if (status === 'inactive') return 'Inactive';
  return 'Pending';
}

export function StatusBadge({ status, className }: { status: StatusBadgeStatus; className?: string }) {
  const normalized = normalizeStatus(status);
  const styles = statusStyles[normalized];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        styles.container,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', styles.dot)} />
      {toLabel(status)}
    </span>
  );
}
