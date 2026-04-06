import { type PropsWithChildren, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import kairosMark from '@/assets/kairos-mark.svg';
import { useDesktopData } from '@/app/DesktopDataContext';

const MIN_SPLASH_VISIBLE_MS = 700;

export function DesktopBootstrapGate({ children }: PropsWithChildren) {
  const { bootstrapped } = useDesktopData();
  const reduceMotion = useReducedMotion();
  const [mountedAt] = useState(() => Date.now());
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (!bootstrapped) {
      return;
    }

    const elapsed = Date.now() - mountedAt;
    const remaining = Math.max(0, MIN_SPLASH_VISIBLE_MS - elapsed);
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, remaining);

    return () => {
      window.clearTimeout(timer);
    };
  }, [bootstrapped, mountedAt]);

  const splash = useMemo(() => (
    <motion.div
      key="desktop-splash"
      initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={reduceMotion ? { opacity: 1 } : { opacity: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--surface-shell)]"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="grid size-24 place-items-center rounded-[28px] bg-[rgba(15,24,28,0.06)] shadow-[var(--shadow-glass)] ring-1 ring-black/5">
          <img src={kairosMark} alt="Kairos" className="size-16" />
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--ink-strong)] sm:text-4xl">
          Kairos
        </h1>
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-[var(--secondary)] animate-pulse" />
          <span className="size-2 rounded-full bg-[var(--secondary)]/60 animate-pulse [animation-delay:120ms]" />
          <span className="size-2 rounded-full bg-[var(--secondary)]/35 animate-pulse [animation-delay:240ms]" />
        </div>
      </div>
    </motion.div>
  ), [reduceMotion]);

  return (
    <>
      {children}
      <AnimatePresence>
        {showSplash ? splash : null}
      </AnimatePresence>
    </>
  );
}
