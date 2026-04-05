import type { PropsWithChildren, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { StatusBadge, type StatusBadgeStatus } from '@/components/ui/status-badge';
import { cn } from '@/lib/utils';

export function SettingsSection({
  title,
  action,
  children,
}: PropsWithChildren<{ title: string; action?: ReactNode }>) {
  return (
    <section className="rounded-[16px] bg-[var(--surface-muted)] p-3 shadow-[var(--shadow-inset-soft)]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-[var(--ink-strong)]">{title}</h2>
        {action}
      </div>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

export function SettingsRow({
  label,
  helper,
  status,
  children,
  stacked = false,
}: PropsWithChildren<{
  label: string;
  helper?: string;
  status?: string;
  stacked?: boolean;
}>) {
  return (
    <div
      className={cn(
        'rounded-xl bg-[var(--surface-subtle)] px-3 py-2.5',
        stacked ? 'space-y-2' : 'flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between',
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-medium text-[var(--ink-strong)]">{label}</p>
          {status ? <span className="text-xs text-[var(--ink-tertiary)]">{status}</span> : null}
        </div>
        {helper ? <p className="mt-0.5 text-xs text-[var(--ink-tertiary)]">{helper}</p> : null}
      </div>
      <div className={cn('min-w-0', stacked ? '' : 'lg:max-w-[55%] lg:flex-1')}>{children}</div>
    </div>
  );
}

export function SettingsInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'h-10 w-full rounded-[10px] border border-black/8 bg-[var(--glass-light)] px-3 text-sm text-[var(--ink-strong-alt)] outline-none shadow-[var(--shadow-glass)]',
        'placeholder:text-[var(--ink-tertiary)] focus:border-[var(--ink-accent)]',
        props.className,
      )}
    />
  );
}

export function SettingsSelect(
  props: React.SelectHTMLAttributes<HTMLSelectElement> & { options: Array<{ label: string; value: string }> },
) {
  const { options, className, ...rest } = props;
  return (
    <select
      {...rest}
      className={cn(
        'h-10 w-full rounded-[10px] border border-black/8 bg-[var(--glass-light)] px-3 text-sm text-[var(--ink-strong-alt)] outline-none shadow-[var(--shadow-glass)]',
        'focus:border-[var(--ink-accent)]',
        className,
      )}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function SettingsToggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        checked
          ? 'border-transparent bg-secondary text-secondary-foreground'
          : 'border-black/10 bg-[var(--surface-chip)] text-[var(--ink-accent)]',
      )}
    >
      <span
        className={cn(
          'h-2.5 w-2.5 rounded-full transition-colors',
          checked ? 'bg-current' : 'bg-[var(--ink-tertiary)]',
        )}
      />
      {label ?? (checked ? 'Enabled' : 'Disabled')}
    </button>
  );
}

export function SettingsActionRow({
  label,
  actions,
}: {
  label: string;
  actions: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-subtle)] px-3 py-2.5">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <p className="text-sm font-medium text-[var(--ink-strong)]">{label}</p>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>
    </div>
  );
}

export function SettingsInfoGrid({ items }: { items: Array<{ label: string; value: string; mono?: boolean }> }) {
  return (
    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <article key={item.label} className="rounded-xl bg-[var(--surface-subtle)] p-3 shadow-[var(--shadow-inset-soft)]">
          <p className="text-xs text-[var(--ink-muted)]">{item.label}</p>
          <p className={cn('mt-1 text-sm font-medium text-[var(--ink-strong)]', item.mono ? 'font-numeric' : '')}>
            {item.value}
          </p>
        </article>
      ))}
    </div>
  );
}

export function SettingsStatusPanel({
  title,
  status,
  rows,
  action,
}: {
  title: string;
  status: StatusBadgeStatus;
  rows: Array<{ label: string; value: string }>;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-[var(--surface-subtle)] p-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-[var(--ink-strong)]">{title}</h3>
        <StatusBadge status={status} />
      </div>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        {rows.map((row) => (
          <div key={row.label} className="rounded-lg bg-[var(--surface-pill)] px-3 py-2">
            <p className="text-xs text-[var(--ink-muted)]">{row.label}</p>
            <p className="mt-1 text-sm font-medium text-[var(--ink-strong)]">{row.value}</p>
          </div>
        ))}
      </div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

export function ResetButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" className="rounded-full! border-black/10" onClick={onClick}>
      Reset
    </Button>
  );
}
