import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/landing/cn';
import { viewportOnce } from '@/lib/landing/motion';

function Tile({
  className,
  title,
  body,
  children,
}: {
  className?: string;
  title: string;
  body?: string;
  children?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      whileHover={{ x: 4, y: 4, boxShadow: '2px 2px 0 0 #0A0A0A' }}
      className={cn(
        'relative bg-paper border-[3px] border-ink rounded-brutal shadow-brutal p-6 overflow-hidden transition-shadow flex flex-col',
        className,
      )}
    >
      <h3 className="font-display font-bold text-2xl leading-tight">{title}</h3>
      {body && <p className="mt-2 font-sans text-ink/70 text-sm">{body}</p>}
      <div className="mt-5 flex-1">{children}</div>
    </motion.div>
  );
}

function SessionBars() {
  const heights = [40, 78, 24, 92, 58, 110, 36, 84, 50, 124, 70, 44];
  return (
    <div className="flex items-end gap-2 h-40">
      {heights.map((h, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={viewportOnce}
          transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 * i }}
          className="flex-1 origin-bottom bg-ink hover:bg-kairos-cyan rounded-sm"
          style={{ height: `${h}px` }}
        />
      ))}
    </div>
  );
}

function LanguageDonut() {
  const segments = [
    { color: '#0A0A0A', pct: 62 },
    { color: '#C8D956', pct: 24 },
    { color: '#0F4E57', pct: 14 },
  ];
  const r = 36;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[110px] w-[110px] shrink-0">
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx="55" cy="55" r={r} fill="none" stroke="#F5F2EC" strokeWidth="14" />
          {segments.map((s, i) => {
            const len = (s.pct / 100) * c;
            const el = (
              <motion.circle
                key={i}
                cx="55"
                cy="55"
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth="14"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                transform="rotate(-90 55 55)"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={viewportOnce}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 + i * 0.2 }}
              />
            );
            offset += len;
            return el;
          })}
        </svg>
      </div>
      <ul className="space-y-2 font-sans text-sm">
        {[
          { l: 'Editor', v: 62, c: 'bg-ink' },
          { l: 'Terminal', v: 24, c: 'bg-signal' },
          { l: 'Browser', v: 14, c: 'bg-interrupt' },
        ].map((row) => (
          <li key={row.l} className="flex items-center gap-2">
            <span className={cn('h-3 w-3 rounded-sm', row.c)} />
            <span className="font-bold">{row.l}</span>
            <span className="text-ink/60 tabular-nums">{row.v}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CalendarHeatmap() {
  const rows = 4;
  const cols = 16;
  const cells = Array.from({ length: rows * cols }, (_, i) => (i * 73 + 11) % 7);
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {cells.map((v, i) => {
        const row = Math.floor(i / cols);
        const tones = [
          'bg-paper',
          'bg-ink/10',
          'bg-ink/30',
          'bg-ink/50',
          'bg-ink/70',
          'bg-kairos-teal/60',
          'bg-kairos-teal',
        ];
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={viewportOnce}
            transition={{ duration: 0.2, delay: row * 0.1 + (i % cols) * 0.015 }}
            className={cn('aspect-square rounded-sm border border-ink/30', tones[v])}
          />
        );
      })}
    </div>
  );
}

function PrivacyToggle() {
  const [redact, setRedact] = useState(false);
  return (
    <div
      className="space-y-3"
      onMouseEnter={() => setRedact(true)}
      onMouseLeave={() => setRedact(false)}
    >
      <div className="font-sans text-sm bg-ink text-paper px-3 py-2 rounded-brutal border-2 border-ink min-h-[40px] flex items-center">
        {redact ? 'Your work, hidden.' : 'Your work, visible.'}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Toggle privacy"
          onClick={() => setRedact((v) => !v)}
          className={cn(
            'relative h-7 w-12 rounded-full border-2 border-ink transition-colors',
            redact ? 'bg-signal' : 'bg-paper',
          )}
        >
          <span
            className={cn(
              'absolute top-1 h-4 w-4 rounded-full  transition-all',
              redact ? 'left-[26px] bg-ink' : 'left-0.5 bg-kairos-teal',
            )}
          />
        </button>
        <span className="font-display text-sm font-bold">
          {redact ? 'Private' : 'Visible'}
        </span>
      </div>
    </div>
  );
}

function MultiMachine() {
  return (
    <svg viewBox="0 0 240 80" className="w-full">
      <g>
        <rect x="10" y="20" width="60" height="40" rx="4" fill="none" stroke="#0A0A0A" strokeWidth="2.5" />
        <rect x="5" y="60" width="70" height="4" fill="#0A0A0A" />
      </g>
      <g>
        <rect x="170" y="20" width="60" height="40" rx="4" fill="none" stroke="#0A0A0A" strokeWidth="2.5" />
        <rect x="165" y="60" width="70" height="4" fill="#0A0A0A" />
      </g>
      <line
        x1="70"
        y1="40"
        x2="170"
        y2="40"
        stroke="#0A0A0A"
        strokeWidth="2"
        strokeDasharray="6 4"
      />
      <circle r="5" fill="#0F4E57">
        <animateMotion dur="2.5s" repeatCount="indefinite" path="M 70 40 L 170 40" />
      </circle>
    </svg>
  );
}

function BridgePill() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setCount((c) => c + 1), 1500);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="flex items-center gap-4">
      <div className="inline-flex items-center gap-2 bg-ink text-paper px-4 py-2 rounded-full border-2 border-ink">
        <span className="h-2.5 w-2.5 rounded-full bg-signal animate-pulse-signal" />
        <span className="font-display text-sm font-bold">Live</span>
      </div>
      <span className="font-sans text-sm text-ink/60 tabular-nums">
        {count} moments captured today
      </span>
    </div>
  );
}

export function FeatureGrid() {
  return (
    <section
      id="features"
      className="relative bg-paper text-ink py-28 md:py-36 px-6 md:px-10 grid-overlay overflow-hidden"
    >
      <div className="mx-auto max-w-7xl">
        <h2 className="font-display font-extrabold text-[clamp(40px,7vw,96px)] leading-[0.95] tracking-tight max-w-4xl">
          Built for everyday coding.
        </h2>

        <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-4 gap-5 md:gap-6">
          <Tile
            className="md:col-span-2 md:row-span-2"
            title="Your week, on one page."
            body="A clear picture of where your hours actually went. Nothing more, nothing less."
          >
            <SessionBars />
          </Tile>
          <Tile
            className="md:col-span-2 md:row-span-2"
            title="The shape of your day."
            body="See the rhythm of how you really work. Focus, breaks, and everything between."
          >
            <LanguageDonut />
          </Tile>
          <Tile
            className="md:col-span-2"
            title="A year at a glance."
            body="Streaks, quiet weeks, and the patterns that quietly shape your year."
          >
            <CalendarHeatmap />
          </Tile>
          <Tile title="Yours to share, or not." body="Hide anything you don’t want recorded. One tap.">
            <PrivacyToggle />
          </Tile>
          <Tile title="One story, every device." body="Move from one screen to the next without losing a beat.">
            <MultiMachine />
          </Tile>
          <Tile
            className="md:col-span-4"
            title="Ready when you are."
            body="It starts when you begin working and keeps your activity on your computer."
          >
            <BridgePill />
          </Tile>
        </div>
      </div>
    </section>
  );
}
