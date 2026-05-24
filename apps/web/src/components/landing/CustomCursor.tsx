import { useEffect, useState } from 'react';
import { useReducedMotion } from './hooks/useReducedMotion';

const INTERACTIVE_SELECTOR = 'a, button, [role="button"], input, select, textarea';

export function CustomCursor() {
  const reduced = useReducedMotion();
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [hot, setHot] = useState(false);
  const [label, setLabel] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    if (isCoarse) return;
    setEnabled(true);

    document.body.style.cursor = 'none';

    const move = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const interactive = target.closest(INTERACTIVE_SELECTOR) as HTMLElement | null;
      setHot(!!interactive);
      if (interactive) {
        const lbl =
          interactive.getAttribute('aria-label') ||
          interactive.getAttribute('data-cursor-label') ||
          interactive.textContent?.trim().slice(0, 24) ||
          null;
        setLabel(lbl);
      } else {
        setLabel(null);
      }
    };

    const leave = () => setPos({ x: -100, y: -100 });

    window.addEventListener('mousemove', move);
    window.addEventListener('mouseleave', leave);
    return () => {
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseleave', leave);
    };
  }, [reduced]);

  if (!enabled) return null;

  return (
    <div
      className="fixed top-0 left-0 z-[60] pointer-events-none mix-blend-difference"
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
      }}
      aria-hidden
    >
      {hot ? (
        <div className="flex items-center gap-2 -translate-x-1/2 -translate-y-1/2">
          <span className="block h-6 w-6 bg-signal rounded-sm" />
          {/* {label && (
            <span className="font-mono text-[10px] uppercase tracking-widest text-paper bg-ink px-2 py-1 rounded-sm whitespace-nowrap">
              → {label}
            </span>
          )} */}
        </div>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          className="-translate-x-1/2 -translate-y-1/2"
        >
          <line x1="8" y1="0" x2="8" y2="16" stroke="#F5F2EC" strokeWidth="1.5" />
          <line x1="0" y1="8" x2="16" y2="8" stroke="#F5F2EC" strokeWidth="1.5" />
        </svg>
      )}
    </div>
  );
}
