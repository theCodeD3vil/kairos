import { motion } from 'framer-motion';
import { Download, ArrowRight } from 'lucide-react';
import { BrutalAnchor } from './primitives/BrutalButton';
import { Crosshair } from './primitives/Crosshair';
import { useCursorTilt } from './hooks/useCursorTilt';
import { useReducedMotion } from './hooks/useReducedMotion';
import { VERSION, REPO_URL, RELEASES_URL } from '@/lib/landing/constants';
import kairosMarkUrl from '@/assets/kairos-mark.svg';

const LINES = ['Your coding time.', 'On your machine.', 'In the open.'];

function SplitHeadline() {
  const reduced = useReducedMotion();
  let counter = 0;
  return (
    <h1 className="font-display font-extrabold leading-[0.95] tracking-tight text-[clamp(48px,9vw,140px)]">
      {LINES.map((line, lineIdx) => {
        const words = line.split(' ');
        return (
          <span key={lineIdx} className="block">
            {words.map((word, wIdx) => (
              <span key={wIdx} className="inline-block whitespace-nowrap">
                {Array.from(word).map((ch, i) => {
                  const delay = reduced ? 0 : counter++ * 0.02;
                  return (
                    <motion.span
                      key={i}
                      initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut', delay }}
                      className="inline-block"
                    >
                      {ch}
                    </motion.span>
                  );
                })}
                {wIdx < words.length - 1 && <span className="inline-block">&nbsp;</span>}
              </span>
            ))}
          </span>
        );
      })}
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
        <div className="flex items-center gap-2 bg-ink px-4 py-3 border-b-[3px] border-ink">
          <span className="h-2.5 w-2.5 rounded-full bg-signal" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-paper/30" aria-hidden />
          <span className="h-2.5 w-2.5 rounded-full bg-paper/30" aria-hidden />
          <div className="ml-auto inline-flex items-center gap-2 text-paper">
            <img
              src={kairosMarkUrl}
              alt=""
              aria-hidden
              data-testid="kairos-app-logo"
              className="h-6 w-6"
            />
            <span className="font-display text-xs font-bold uppercase tracking-wider">Kairos</span>
          </div>
        </div>
        <div className="p-6 space-y-5 bg-paper">
          <div className="flex items-baseline justify-between">
            <div className="flex items-center gap-2">
              <img
                src={kairosMarkUrl}
                alt=""
                aria-hidden
                data-testid="kairos-app-logo"
                className="h-7 w-7"
              />
              <p className="font-display text-lg font-bold">This week</p>
            </div>
            <p className="font-mono text-3xl font-bold tabular-nums">22h 14m</p>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {[24, 56, 12, 78, 92, 44, 30].map((h, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="w-full bg-ink rounded-sm" style={{ height: `${h}px` }} />
                <span className="font-mono text-[10px] text-ink/40">
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                </span>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { l: 'Editor', v: '62%' },
              { l: 'Terminal', v: '24%' },
              { l: 'Browser', v: '14%' },
            ].map((s) => (
              <div key={s.l} className="border-2 border-ink rounded-brutal px-3 py-2">
                <p className="font-display text-xs font-bold">{s.l}</p>
                <p className="font-mono text-base font-bold tabular-nums mt-0.5">{s.v}</p>
              </div>
            ))}
          </div>
        </div>
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
        <SplitHeadline />
        <p className="font-sans text-lg md:text-xl text-ink/80 max-w-xl">
          An open source alternative for tracking coding time locally.
        </p>
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
