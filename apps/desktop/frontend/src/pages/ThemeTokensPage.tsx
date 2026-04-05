const surfaceTokens = [
  'surface-strong',
  'surface',
  'surface-muted',
  'surface-subtle',
  'surface-contrast',
  'surface-pill',
  'surface-soft',
  'surface-shell',
  'surface-navbar',
  'surface-chip',
  'surface-chip-hover',
  'surface-quiet',
  'surface-accent',
  'surface-deep',
  'surface-deep-alt',
];

const inkTokens = [
  'ink-strong',
  'ink-strong-alt',
  'ink-primary',
  'ink-accent',
  'ink-accent-strong',
  'ink-secondary',
  'ink-tertiary',
  'ink-muted',
  'ink-soft',
  'ink-label',
  'ink-teal',
  'ink-night',
  'ink-night-soft',
  'ink-void',
  'ink-void-muted',
  'ink-void-faint',
];

const chartTokens = ['chart-green', 'chart-blue', 'chart-indigo', 'chart-red', 'chart-amber', 'chart-lime'];

const statusTokens = ['status-ok', 'status-ok-alt', 'status-err', 'status-err-alt'];

const shadowTokens = [
  { label: 'shadow-inset-soft', sample: 'shadow-[var(--shadow-inset-soft)]' },
  { label: 'shadow-inset-faint', sample: 'shadow-[var(--shadow-inset-faint)]' },
  { label: 'shadow-glass', sample: 'shadow-[var(--shadow-glass)]' },
  { label: 'shadow-elevated', sample: 'shadow-[var(--shadow-elevated)]' },
  { label: 'shadow-layered', sample: 'shadow-[var(--shadow-layered)]' },
];

const glassTokens = [
  { label: 'glass-light', sample: 'bg-[var(--glass-light)]' },
  { label: 'glass-light-strong', sample: 'bg-[var(--glass-light-strong)]' },
];

function ColorSwatch({ token }: { token: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-black/5 bg-white/70 p-3 shadow-[var(--shadow-inset-faint)]">
      <div className="h-14 w-full rounded-xl" style={{ backgroundColor: `var(--${token})` }} />
      <p className="text-sm font-medium text-[var(--ink-strong)]">{token}</p>
    </div>
  );
}

function ShadowSwatch({ label, sample }: { label: string; sample: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-black/5 bg-white/70 p-3 shadow-[var(--shadow-inset-faint)]">
      <div className={`h-14 w-full rounded-xl bg-white ${sample}`} />
      <p className="text-sm font-medium text-[var(--ink-strong)]">{label}</p>
    </div>
  );
}

function GlassSwatch({ label, sample }: { label: string; sample: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-black/5 bg-white/70 p-3 shadow-[var(--shadow-inset-faint)]">
      <div className={`h-14 w-full rounded-xl ${sample} shadow-[var(--shadow-inset-soft)]`} />
      <p className="text-sm font-medium text-[var(--ink-strong)]">{label}</p>
    </div>
  );
}

export function ThemeTokensPage() {
  return (
    <div className="space-y-6">
      <section className="rounded-[18px] bg-[var(--surface)] p-5">
        <h1 className="text-2xl font-semibold text-[var(--ink-strong)]">Theme Tokens</h1>
      </section>

      <section className="space-y-3 rounded-[18px] bg-[var(--surface)] p-5">
        <h2 className="text-xl font-semibold text-[var(--ink-strong)]">Surfaces</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {surfaceTokens.map((token) => (
            <ColorSwatch key={token} token={token} />
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-[18px] bg-[var(--surface)] p-5">
        <h2 className="text-xl font-semibold text-[var(--ink-strong)]">Ink</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {inkTokens.map((token) => (
            <ColorSwatch key={token} token={token} />
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-[18px] bg-[var(--surface)] p-5">
        <h2 className="text-xl font-semibold text-[var(--ink-strong)]">Charts</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          {chartTokens.map((token) => (
            <ColorSwatch key={token} token={token} />
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-[18px] bg-[var(--surface)] p-5">
        <h2 className="text-xl font-semibold text-[var(--ink-strong)]">Status</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {statusTokens.map((token) => (
            <ColorSwatch key={token} token={token} />
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-[18px] bg-[var(--surface)] p-5">
        <h2 className="text-xl font-semibold text-[var(--ink-strong)]">Shadows</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shadowTokens.map((shadow) => (
            <ShadowSwatch key={shadow.label} label={shadow.label} sample={shadow.sample} />
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-[18px] bg-[var(--surface)] p-5">
        <h2 className="text-xl font-semibold text-[var(--ink-strong)]">Glass</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {glassTokens.map((glass) => (
            <GlassSwatch key={glass.label} label={glass.label} sample={glass.sample} />
          ))}
        </div>
      </section>
    </div>
  );
}

