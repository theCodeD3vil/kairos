import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

type LiveRefreshIndicatorProps = {
  pulseKey: number;
};

export function LiveRefreshIndicator({
  pulseKey,
}: LiveRefreshIndicatorProps) {
  const reduceMotion = useReducedMotion();
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (pulseKey === 0) {
      return;
    }

    setActive(true);

    const timer = window.setTimeout(() => {
      setActive(false);
    }, 900);

    return () => {
      window.clearTimeout(timer);
    };
  }, [pulseKey]);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[var(--surface-pill)] px-2.5 py-1 text-xs font-medium text-[var(--ink-accent)]">
      <motion.span
        className={cn(
          'h-2 w-2 rounded-full bg-[var(--ink-tertiary)] shadow-[0_0_0_0_rgba(0,0,0,0)]',
          active ? 'bg-secondary' : '',
        )}
        animate={
          reduceMotion
            ? { opacity: active ? 1 : 0.72 }
            : active
              ? {
                  opacity: [0.72, 1, 0.78],
                  scale: [1, 1.18, 1],
                  boxShadow: [
                    '0 0 0 0 rgba(217,226,101,0)',
                    '0 0 0 6px rgba(217,226,101,0.18)',
                    '0 0 0 0 rgba(217,226,101,0)',
                  ],
                }
              : {
                  opacity: 0.72,
                  scale: 1,
                  boxShadow: '0 0 0 0 rgba(217,226,101,0)',
                }
        }
        transition={{
          duration: reduceMotion ? 0.12 : 0.7,
          ease: [0.22, 1, 0.36, 1],
        }}
      />
      <span>Live</span>
    </div>
  );
}
