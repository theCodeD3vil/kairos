import { motion } from 'framer-motion';
import {
  HardDrive,
  Activity,
  Code2,
  EyeOff,
  Laptop,
  CalendarRange,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/landing/cn';
import { viewportOnce } from '@/lib/landing/motion';
import { SectionTag } from './primitives/SectionTag';

type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
  iconTone: string;
};

const FEATURES: Feature[] = [
  {
    icon: HardDrive,
    title: 'Local-first by default.',
    body: 'Every event lives in a SQLite file on your machine. No cloud account. No telemetry leaving the door.',
    iconTone: 'bg-kairos-teal text-paper',
  },
  {
    icon: Activity,
    title: 'Smart sessionization.',
    body: 'Kairos splits idle gaps and merges adjacent sessions automatically. You get clean blocks, not raw pings.',
    iconTone: 'bg-signal text-ink',
  },
  {
    icon: Code2,
    title: 'Editor-aware tracking.',
    body: 'The VS Code extension reports what you build over a local bridge. Editor, language, project — all captured.',
    iconTone: 'bg-ink text-paper',
  },
  {
    icon: EyeOff,
    title: 'Privacy you control.',
    body: 'Redact file paths, exclude folders, or pause capture. Settings live with you, applied everywhere.',
    iconTone: 'bg-kairos-cyan text-ink',
  },
  {
    icon: Laptop,
    title: 'One identity, many machines.',
    body: 'Move from laptop to desktop and keep the same story. Sessions never merge across devices or dates.',
    iconTone: 'bg-interrupt text-paper',
  },
  {
    icon: CalendarRange,
    title: 'Time ranges that fit.',
    body: 'Zoom from today to the full year. 1D, 7D, 1M, 90D, All — every page bends to the window you pick.',
    iconTone: 'bg-paper text-ink border-[3px] border-ink',
  },
];

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const Icon = feature.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.45, ease: 'easeOut', delay: index * 0.06 }}
      whileHover={{ x: 4, y: 4, boxShadow: '2px 2px 0 0 #0A0A0A' }}
      className="relative bg-paper border-[3px] border-ink rounded-brutal shadow-brutal p-6 md:p-7 flex flex-col gap-4 transition-shadow"
    >
      <div
        className={cn(
          'inline-grid h-12 w-12 place-items-center rounded-brutal border-[3px] border-ink',
          feature.iconTone,
        )}
        aria-hidden
      >
        <Icon className="h-6 w-6 stroke-[2.5px]" />
      </div>
      <div>
        <h3 className="font-display font-bold text-xl md:text-2xl leading-tight">
          {feature.title}
        </h3>
        <p className="mt-2 font-sans text-ink/70 text-sm md:text-base leading-relaxed">
          {feature.body}
        </p>
      </div>
      <span
        className="absolute top-4 right-4 font-mono text-[11px] tracking-[0.2em] text-ink/40"
        aria-hidden
      >
        {String(index + 1).padStart(2, '0')}
      </span>
    </motion.div>
  );
}

export function FeaturesOfKairos() {
  return (
    <section
      id="features-of-kairos"
      className="relative bg-paper text-ink py-28 md:py-36 px-6 md:px-10 grid-overlay overflow-hidden"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 max-w-3xl">
          <SectionTag index="03" label="What Kairos does" />
          <h2 className="font-display font-extrabold text-[clamp(40px,7vw,96px)] leading-[0.95] tracking-tight">
            Everything you need. Nothing you don’t.
          </h2>
          <p className="font-sans text-ink/70 text-base md:text-lg max-w-2xl">
            Six pieces that work together quietly while you build. Local, private, and shaped around the way you actually code.
          </p>
        </div>

        <div className="mt-16 md:mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
