import { useEffect, useRef } from 'react';
import { useReducedMotion } from './useReducedMotion';

export function useCursorTilt<T extends HTMLElement>(baseRotate = -3, range = 2) {
  const ref = useRef<T | null>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.style.transform = `rotate(${baseRotate}deg)`;
      return;
    }

    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx;
      const dy = (e.clientY - cy) / cy;
      const rx = baseRotate + dx * range;
      const ry = dy * range * 0.5;
      el.style.transform = `rotate(${rx}deg) translateY(${ry * -2}px)`;
    };

    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [baseRotate, range, reduced]);

  return ref;
}
