import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Download, EyeOff, HardDrive, PauseCircle, ShieldCheck } from 'lucide-react';
import { viewportOnce } from '@/lib/landing/motion';

const REAL_VALUE = 'Working on a passion project';
const HIDDEN_VALUE = 'Something personal';

const PRINCIPLES = [
  {
    title: 'Local history.',
    body: 'Everything Kairos sees is written to your computer first.',
    icon: HardDrive,
  },
  {
    title: 'No account gate.',
    body: 'Open the app and start tracking without email, subscription, or sign-in.',
    icon: ShieldCheck,
  },
  {
    title: 'Redaction controls.',
    body: 'Hide sensitive windows, pause tracking, and decide what is visible.',
    icon: EyeOff,
  },
  {
    title: 'Portable records.',
    body: 'Review your history, back it up, export it, or remove it.',
    icon: Download,
  },
] as const;

function PrincipleList() {
  return (
    <div className="mt-8 sm:mt-12 grid sm:grid-cols-2 gap-px border-2 border-ink bg-ink">
      {PRINCIPLES.map((item, i) => {
        const Icon = item.icon;
        return (
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={viewportOnce}
            transition={{ duration: 0.4, ease: 'easeOut', delay: i * 0.06 }}
            className="bg-ink p-4 sm:p-5 text-paper md:p-6 min-h-40 sm:min-h-44"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-brutal border-2 border-paper bg-paper text-ink">
                <Icon className="h-5 w-5 stroke-[2.5px]" />
              </span>
              <h3 className="font-display text-xl font-bold leading-tight">{item.title}</h3>
            </div>
            <p className="mt-5 font-sans text-sm md:text-base leading-relaxed text-paper/70">
              {item.body}
            </p>
          </motion.div>
        );
      })}
    </div>
  );
}

function SignalRail() {
  return (
    <div className="relative hidden lg:block h-full min-h-[560px]">
      <div className="absolute left-1/2 top-0 h-full w-[3px] -translate-x-1/2 bg-ink" />
      {[0, 1, 2, 3].map((item) => (
        <motion.span
          key={item}
          initial={{ x: '-50%', scale: 0 }}
          whileInView={{ x: '-50%', scale: 1 }}
          viewport={viewportOnce}
          transition={{ duration: 0.25, ease: 'easeOut', delay: item * 0.1 }}
          className="absolute left-1/2 h-5 w-5 rounded-full border-2 border-ink bg-signal"
          style={{ top: `${14 + item * 24}%` }}
        />
      ))}
    </div>
  );
}

function LocalStoreVisual() {
  const [showReal, setShowReal] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => setShowReal((v) => !v), 2200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, rotate: 2, y: 24 }}
      whileInView={{ opacity: 1, rotate: -1, y: 0 }}
      viewport={viewportOnce}
      transition={{ duration: 0.55, ease: 'easeOut' }}
      className="relative"
    >
      <div className="absolute inset-0 translate-x-4 translate-y-4 bg-signal rounded-brutal" aria-hidden />
      <div className="relative overflow-hidden rounded-brutal border-[3px] border-ink bg-paper text-ink shadow-brutal-lg">
        <div className="flex items-center justify-between border-b-[3px] border-ink bg-ink px-5! py-4 text-paper">
          <div className="flex items-center gap-2 px-2">
            <span className="h-3 w-3 rounded-full bg-signal" />
            <span className="h-3 w-3 rounded-full bg-paper" />
            <span className="h-3 w-3 rounded-full bg-paper" />
          </div>
          <p className="font-display text-xs mr-2 font-bold uppercase tracking-[0.22em]">Local Store</p>
        </div>

        <div className="grid gap-5 p-4 sm:p-5 md:p-7">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
            <div className="border-2 border-ink bg-paper px-3 py-3 sm:px-4 sm:py-4">
              <p className="font-display text-xs font-bold uppercase tracking-widest text-ink/45">
                Step 1
              </p>
              <p className="mt-2 font-display text-xl sm:text-2xl font-bold">Editor</p>
            </div>
            <div className="hidden md:block h-[3px] w-6 lg:w-10 bg-ink" />
            <div className="border-2 border-ink bg-paper px-3 py-3 sm:px-4 sm:py-4">
              <p className="font-display text-xs font-bold uppercase tracking-widest text-ink/45">
                Step 2
              </p>
              <p className="mt-2 font-display text-xl sm:text-2xl font-bold">Kairos</p>
            </div>
            <div className="hidden md:block h-[3px] w-6 lg:w-10 bg-ink" />
            <div className="border-2 border-ink bg-paper px-3 py-3 sm:px-4 sm:py-4">
              <p className="font-display text-xs font-bold uppercase tracking-widest text-ink/45">
                Step 3
              </p>
              <p className="mt-2 font-display text-xl sm:text-2xl font-bold">Disk</p>
            </div>
          </div>

          <div className="border-2 border-ink bg-ink p-4 sm:p-5 text-paper">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="font-display text-xs sm:text-sm font-bold uppercase tracking-widest text-paper/55">
                Private activity
              </p>
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-paper px-3 py-1 font-display text-xs font-bold uppercase tracking-widest">
                <span className="h-2.5 w-2.5 rounded-full bg-signal animate-pulse-signal" />
                Local
              </span>
            </div>

            <motion.p
              key={showReal ? 'real' : 'hidden'}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="mt-6 sm:mt-8 min-h-[4rem] sm:min-h-[5rem] font-display text-3xl sm:text-4xl md:text-5xl font-extrabold leading-[0.95]"
            >
              {showReal ? REAL_VALUE : HIDDEN_VALUE}
            </motion.p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                ['Share', 'Off'],
                ['Account', 'None'],
                ['Export', 'Ready'],
              ].map(([label, value]) => (
                <div key={label} className="border-2 border-paper/40 px-3 py-3">
                  <p className="font-sans text-xs text-paper/55">{label}</p>
                  <p className="mt-1 font-display text-lg font-bold">{value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 bg-signal px-4 py-2 font-display text-sm font-bold text-ink">
              <PauseCircle className="h-4 w-4 stroke-[2.5px]" />
              Pause anytime
            </div>
            <div className="inline-flex items-center gap-2 border-2 border-ink px-4 py-2 font-display text-sm font-bold">
              <HardDrive className="h-4 w-4 stroke-[2.5px]" />
              Stored locally
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function Privacy() {
  return (
    <section id="privacy" className="relative overflow-hidden bg-paper px-6 py-20 sm:py-28 text-ink md:px-10 md:py-36">
      <div
        className="absolute inset-0 opacity-10"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(#0A0A0A 1px, transparent 1px), linear-gradient(90deg, #0A0A0A 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[minmax(0,1fr)_80px_minmax(420px,0.95fr)] lg:items-center">
        <div>

          <PrincipleList />
        </div>
        <SignalRail />
        <LocalStoreVisual />
      </div>
    </section>
  );
}
