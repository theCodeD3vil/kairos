import { useScrollProgress } from './hooks/useScrollProgress';

export function ScrollProgress() {
  const p = useScrollProgress();
  return (
    <div
      className="fixed top-0 left-0 right-0 h-[3px] bg-paper/40 z-50 pointer-events-none"
      aria-hidden
    >
      <div
        className="h-full bg-signal origin-left will-change-transform"
        style={{ transform: `scaleX(${p})` }}
      />
    </div>
  );
}
