import { useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

export function useMagneticButton<T extends HTMLElement>(radius = 80, max = 6) {
  const ref = useRef<T | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.hypot(dx, dy);
      if (dist > radius) {
        el.style.transform = '';
        return;
      }
      const pull = (radius - dist) / radius;
      el.style.transform = `translate(${(dx / radius) * max * pull}px, ${(dy / radius) * max * pull}px)`;
    };

    const onLeave = () => {
      el.style.transition = 'transform 200ms ease-out';
      el.style.transform = '';
      window.setTimeout(() => {
        if (el) el.style.transition = '';
      }, 220);
    };

    window.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
    };
  }, [radius, max, reduced]);

  return ref;
}
