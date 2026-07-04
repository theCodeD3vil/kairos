import { cn } from '@/lib/utils';

export function Skeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-md bg-[var(--loading-skeleton)] shadow-[var(--shadow-inset-soft)] ring-1 ring-[hsl(var(--border)/0.9)]',
        'after:absolute after:inset-0 after:-translate-x-full after:bg-[linear-gradient(90deg,transparent,var(--loading-skeleton-highlight),transparent)] after:motion-safe:animate-[loading-skeleton-shimmer_1.35s_ease-in-out_infinite]',
        className,
      )}
    />
  );
}
