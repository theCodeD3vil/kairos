import { useEffect, type ReactNode } from 'react';
import Lenis from 'lenis';
import { useReducedMotion } from '@/components/landing/hooks/useReducedMotion';

export function LenisProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    let raf = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, [reduced]);

  return <>{children}</>;
}
