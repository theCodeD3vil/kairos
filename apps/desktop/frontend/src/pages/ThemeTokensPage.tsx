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

function ComponentPreview({ name, description, demo }: { name: string; description: string; demo: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[hsl(var(--border)/0.55)] bg-[var(--surface)] p-4 shadow-[var(--shadow-inset-faint)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--ink-strong)]">{name}</p>
          <p className="text-xs text-[var(--ink-muted)]">{description}</p>
        </div>
      </div>
      <div className="rounded-xl bg-[var(--surface-quiet)] p-3">{demo}</div>
    </div>
  );
}

function SlidingNavDemo() {
  const [tab, setTab] = useState('one');
  const tabs = [
    { title: 'One', url: '/one' },
    { title: 'Two', url: '/two' },
    { title: 'Three', url: '/three' },
  ];

  return (
    <SlidingCapsuleNav tabs={tabs} currentTab={tab} onChange={setTab} className="p-2" />
  );
}

function SegmentedDemo() {
  const [value, setValue] = useState('week');
  return (
    <SegmentedButton
      size="sm"
      value={value}
      onChange={setValue}
      options={[
        { label: 'Day', value: 'day' },
        { label: 'Week', value: 'week' },
        { label: 'Month', value: 'month' },
      ]}
    />
  );
}

const componentPreviews = [
  {
    name: 'Button',
    description: 'Primary action button',
    demo: <Button>Primary</Button>,
  },
  {
    name: 'SegmentedButton',
    description: 'Compact range selector',
    demo: <SegmentedDemo />,
  },
  {
    name: 'SlidingCapsuleNav',
    description: 'Rounded pill nav for tabs',
    demo: <SlidingNavDemo />,
  },
  {
    name: 'StatusBadge',
    description: 'Health/status pill',
    demo: (
      <div className="flex items-center gap-2">
        <StatusBadge status="healthy" />
        <StatusBadge status="degraded" />
        <StatusBadge status="offline" />
      </div>
    ),
  },
];

function ColorSwatch({ token }: { token: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[hsl(var(--border)/0.55)] bg-[var(--surface)] p-3 shadow-[var(--shadow-inset-faint)]">
      <div className="h-14 w-full rounded-xl" style={{ backgroundColor: `var(--${token})` }} />
      <p className="text-sm font-medium text-[var(--ink-strong)]">{token}</p>
    </div>
  );
}

function ShadowSwatch({ label, sample }: { label: string; sample: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[hsl(var(--border)/0.55)] bg-[var(--surface)] p-3 shadow-[var(--shadow-inset-faint)]">
      <div className={`h-14 w-full rounded-xl bg-[var(--surface-quiet)] ${sample}`} />
      <p className="text-sm font-medium text-[var(--ink-strong)]">{label}</p>
    </div>
  );
}

function GlassSwatch({ label, sample }: { label: string; sample: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[hsl(var(--border)/0.55)] bg-[var(--surface)] p-3 shadow-[var(--shadow-inset-faint)]">
      <div className={`h-14 w-full rounded-xl ${sample} shadow-[var(--shadow-inset-soft)]`} />
      <p className="text-sm font-medium text-[var(--ink-strong)]">{label}</p>
    </div>
  );
}

export function ThemeTokensPage() {
  const tabs = [
    { title: 'Tokens', url: 'tokens' },
    { title: 'Components', url: 'components' },
  ];
  const [activeTab, setActiveTab] = useState(tabs[0].url);

  return (
    <div className="space-y-6">
      <section className="rounded-[18px] bg-[var(--surface)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-semibold text-[var(--ink-strong)]">Theme & Components</h1>
          <SlidingCapsuleNav tabs={tabs} currentTab={activeTab} onChange={setActiveTab} className="p-1" />
        </div>
      </section>

      {activeTab === 'tokens' ? (
        <div className="space-y-3 rounded-[18px] bg-[var(--surface)] p-5">
          <div className="space-y-3">
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">Surfaces</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {surfaceTokens.map((token) => (
                <ColorSwatch key={token} token={token} />
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-5">
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">Ink</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {inkTokens.map((token) => (
                <ColorSwatch key={token} token={token} />
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-5">
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">Charts</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              {chartTokens.map((token) => (
                <ColorSwatch key={token} token={token} />
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-5">
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">Status</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {statusTokens.map((token) => (
                <ColorSwatch key={token} token={token} />
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-5">
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">Shadows</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {shadowTokens.map((shadow) => (
                <ShadowSwatch key={shadow.label} label={shadow.label} sample={shadow.sample} />
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-5">
            <h2 className="text-xl font-semibold text-[var(--ink-strong)]">Glass</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {glassTokens.map((glass) => (
                <GlassSwatch key={glass.label} label={glass.label} sample={glass.sample} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <section className="space-y-3 rounded-[18px] bg-[var(--surface)] p-5">
          <h2 className="text-xl font-semibold text-[var(--ink-strong)]">Components</h2>
          <p className="text-sm text-[var(--ink-muted)]">Core JolyUI-backed pieces available in the repo.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {componentPreviews.map((item) => (
              <ComponentPreview key={item.name} name={item.name} description={item.description} demo={item.demo} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
import type React from 'react';
import { useState } from 'react';
import { SlidingCapsuleNav } from '@/components/satisui/sliding-capsule-nav';
import { Button } from '@/components/ui/button';
import { SegmentedButton } from '@/components/ui/segmented-button';
import { StatusBadge } from '@/components/ui/status-badge';
