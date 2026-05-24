import { useEffect, useRef, useState } from 'react';
import { VERSION } from '@/lib/landing/constants';
import { useReducedMotion } from './hooks/useReducedMotion';

function useCountUp(target: number, durationMs = 1200) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLParagraphElement | null>(null);
  const [value, setValue] = useState(reduced ? target : 0);

  useEffect(() => {
    if (reduced) {
      setValue(target);
      return;
    }
    const el = ref.current;
    if (!el) return;
    let started = false;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !started) {
            started = true;
            const t0 = performance.now();
            const tick = (now: number) => {
              const p = Math.min(1, (now - t0) / durationMs);
              const eased = 1 - Math.pow(1 - p, 3);
              setValue(Math.round(target * eased));
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
          }
        });
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, durationMs, reduced]);

  return { ref, value };
}

function Counter({ to, suffix = '', label }: { to: number; suffix?: string; label: string }) {
  const { ref, value } = useCountUp(to);
  return (
    <div className="space-y-3">
      <p
        ref={ref}
        className="font-display font-extrabold tabular-nums text-[clamp(56px,10vw,100px)] leading-none"
      >
        {value}
        {suffix}
      </p>
      <p className="font-display text-base font-bold text-paper/70">{label}</p>
    </div>
  );
}

export function Stats() {
  return (
    <section className="relative bg-ink text-paper py-20 sm:py-24 md:py-32 px-6 md:px-10 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 sm:gap-12 md:gap-24 text-center sm:text-left">
          <div className="space-y-3 w-full">
            <p className="font-display font-extrabold tabular-nums text-[clamp(56px,10vw,100px)] leading-none">
              v{VERSION}
            </p>
            <p className="font-display text-base font-bold text-paper/70">Available today</p>
          </div>
          <div className="space-y-3 w-full">
            <p className="font-display font-extrabold text-[clamp(56px,10vw,100px)] leading-none">
              Free
            </p>
            <p className="font-display text-base font-bold text-paper/70">Now and forever</p>
          </div>
          <Counter to={100} suffix="%" label="Open source, top to bottom" />
        </div>
      </div>
    </section>
  );
}
