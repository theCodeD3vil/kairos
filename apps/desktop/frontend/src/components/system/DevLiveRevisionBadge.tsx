import { useEffect, useState } from 'react';
import { EventsOn } from '../../../wailsjs/runtime/runtime';

const dataChangedEventName = 'kairos:data-changed';

type RevisionPayload = {
  kind?: unknown;
  revision?: unknown;
  emittedAt?: unknown;
};

type BadgeState = {
  kind: string;
  revision: number;
  emittedAtLabel: string;
  emittedAtISO?: string;
  lagMs?: number;
};

function normalizeRevision(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return null;
}

function normalizeKind(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.toLowerCase();
}

function normalizeTimestamp(value: unknown): Date | null {
  if (typeof value !== 'string') {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function formatTimestampLabel(value: Date): string {
  const pad = (input: number, width = 2) => String(input).padStart(width, '0');
  return `${pad(value.getHours())}:${pad(value.getMinutes())}:${pad(value.getSeconds())}.${pad(value.getMilliseconds(), 3)}`;
}

function extractEventState(args: unknown[]): BadgeState | null {
  let kind: string | null = null;
  let revision: number | null = null;
  let emittedAt: Date | null = null;

  for (const arg of args) {
    if (!arg || typeof arg !== 'object') {
      continue;
    }
    const payload = arg as RevisionPayload;
    kind = kind ?? normalizeKind(payload.kind);
    revision = revision ?? normalizeRevision(payload.revision);
    emittedAt = emittedAt ?? normalizeTimestamp(payload.emittedAt);
  }

  for (const arg of args) {
    if (!kind) {
      kind = normalizeKind(arg);
    }
    if (kind) {
      break;
    }
  }

  if (revision === null) {
    return null;
  }

  return {
    kind: kind ?? 'unknown',
    revision,
    emittedAtLabel: emittedAt ? formatTimestampLabel(emittedAt) : '—',
    emittedAtISO: emittedAt ? emittedAt.toISOString() : undefined,
    lagMs: emittedAt ? Math.max(0, Date.now() - emittedAt.getTime()) : undefined,
  };
}

function lagToneClass(lagMs?: number): string {
  if (lagMs === undefined) {
    return 'text-[var(--ink-muted)]';
  }
  if (lagMs < 100) {
    return 'text-emerald-500';
  }
  if (lagMs <= 500) {
    return 'text-amber-500';
  }
  return 'text-red-500';
}

export function DevLiveRevisionBadge() {
  const [latest, setLatest] = useState<BadgeState | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return;
    }
    if (!(window as unknown as { runtime?: unknown }).runtime) {
      return;
    }

    const unsubscribe = EventsOn(dataChangedEventName, (...eventArgs: unknown[]) => {
      const extracted = extractEventState(eventArgs);
      if (!extracted) {
        return;
      }
      setLatest((current) => {
        if (current && extracted.revision <= current.revision) {
          return current;
        }
        return extracted;
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!import.meta.env.DEV) {
    return null;
  }

  return (
    <div
      className="inline-flex items-center rounded-full border border-[hsl(var(--border)/0.7)] bg-[var(--surface-pill)] px-2.5 py-1 text-[11px] font-medium text-[var(--ink-secondary)]"
      title={latest?.emittedAtISO ? `${latest.emittedAtISO}${latest.lagMs !== undefined ? ` · ${latest.lagMs}ms lag` : ''}` : 'waiting'}
    >
      <span className="text-[var(--ink-muted)]">rev</span>
      <span className="ml-1 font-semibold text-[var(--ink-accent)]">{latest?.revision ?? '-'}</span>
      <span className="ml-1 text-[var(--ink-muted)]">·</span>
      <span className="ml-1 truncate max-w-[10rem]" title={latest?.kind ?? 'waiting'}>
        {latest?.kind ?? 'waiting'}
      </span>
      <span className="ml-1 text-[var(--ink-muted)]">·</span>
      <span className="ml-1">{latest?.emittedAtLabel ?? '—'}</span>
      <span className="ml-1 text-[var(--ink-muted)]">·</span>
      <span className={`ml-1 ${lagToneClass(latest?.lagMs)}`}>{latest?.lagMs !== undefined ? `${latest.lagMs}ms` : '—'}</span>
    </div>
  );
}
