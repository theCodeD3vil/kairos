import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Download,
  ArrowRight,
  CalendarRange,
  LineChart,
  ClockAlert,
  type LucideIcon,
} from 'lucide-react';
import { BrutalAnchor } from './primitives/BrutalButton';
import { Crosshair } from './primitives/Crosshair';
import { useCursorTilt } from './hooks/useCursorTilt';
import { useReducedMotion } from './hooks/useReducedMotion';
import { VERSION, REPO_URL, RELEASES_URL } from '@/lib/landing/constants';
import kairosFullUrl from '@/assets/kairos-full.png';

const HERO_TEXT = 'Track your coding';
const HERO_WORDS: Array<{
  label: string;
  icon: LucideIcon;
  colorClassName: string;
  iconClassName: string;
}> = [
    {
      label: 'metrics',
      icon: LineChart,
      colorClassName: 'text-ink',
    iconClassName: 'text-[#0F4E57] ',
    },
    {
      label: 'time',
      icon: ClockAlert,
      colorClassName: 'text-ink',
      iconClassName: 'text-signal',
    },
    {
      label: 'patterns',
      icon: CalendarRange,
      colorClassName: 'text-ink',
      iconClassName: 'text-[#1CBCC6] ',
    },
  ];

function LayoutTextFlip({
  text,
  words,
  duration = 3000,
}: {
  text: string;
  words: typeof HERO_WORDS;
  duration?: number;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced || words.length < 2) return;

    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % words.length);
    }, duration);

    return () => window.clearInterval(id);
  }, [duration, reduced, words.length]);

  const word = words[index] ?? words[0];
  const Icon = word.icon;

  return (
    <h1 className="flex flex-col items-center justify-center gap-3 font-display text-[clamp(44px,8vw,100px)] font-extrabold leading-[0.95] tracking-tight">
      <motion.span
        initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {text}
      </motion.span>
      <motion.span
        layout
        aria-live="polite"
        className="inline-flex overflow-hidden"
        transition={{ layout: { duration: 0.35, ease: 'easeOut' } }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={word.label}
            initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: -32 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className={`inline-flex items-center gap-[0.16em] whitespace-nowrap ${word.colorClassName}`}
          >
            <span
              className={`grid   shrink-0 place-items-center  ${word.iconClassName}`}
              aria-hidden
            >
              <Icon className="size-[0.8em] stroke-[3px]" />
            </span>
            <span className=' font-mono' >{word.label}</span>
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </h1>
  );
}

function ScreenshotCard() {
  const ref = useCursorTilt<HTMLDivElement>(-3, 2);
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? { rotate: -3, opacity: 1 } : { rotate: -8, opacity: 0 }}
      animate={{ rotate: -3, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      className="relative w-full max-w-[640px] mx-auto"
    >
      <div className="absolute inset-0 translate-x-3 translate-y-3 bg-signal rounded-brutal -z-10" aria-hidden />
      <div
        ref={ref}
        className="bg-paper border-[3px] border-ink rounded-brutal shadow-brutal-lg overflow-hidden will-change-transform"
        style={{ transform: 'rotate(-3deg)' }}
      >
        <img
          src={kairosFullUrl}
          alt="Kairos app preview"
          className="block w-full h-auto"
        />
      </div>
    </motion.div>
  );
}

export function Hero() {
  return (
    <section
      id="top"
      className="relative min-h-screen bg-paper text-ink overflow-hidden grid-overlay"
    >
      <Crosshair className="absolute top-6 left-6 opacity-40" />
      <Crosshair className="absolute top-6 right-6 opacity-40" />
      <Crosshair className="absolute bottom-6 left-6 opacity-40" />
      <Crosshair className="absolute bottom-6 right-6 opacity-40" />

      <div className="relative mx-auto max-w-7xl px-6 md:px-10 pt-32 md:pt-40 pb-20 flex flex-col items-center text-center gap-10">
        <LayoutTextFlip text={HERO_TEXT} words={HERO_WORDS} />
        <div className="flex flex-wrap justify-center gap-4">
          <BrutalAnchor as="a" href={RELEASES_URL} variant="primary">
            <Download className="h-4 w-4" />
            Download v{VERSION}
          </BrutalAnchor>
          <BrutalAnchor
            as="a"
            href={REPO_URL}
            variant="outline"
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
            <ArrowRight className="h-4 w-4" />
          </BrutalAnchor>
        </div>

        <div className="w-full max-w-3xl mt-8 md:mt-12">
          <ScreenshotCard />
        </div>
      </div>
    </section>
  );
}
