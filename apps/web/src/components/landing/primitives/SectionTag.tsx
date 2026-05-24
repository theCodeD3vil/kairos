import { cn } from '@/lib/landing/cn';

type Props = {
  index: string;
  label: string;
  tone?: 'ink' | 'paper';
  className?: string;
};

export function SectionTag({ index, label, tone = 'ink', className }: Props) {
  return (
    <p
      className={cn(
        'font-mono text-[11px] uppercase tracking-[0.25em]',
        tone === 'ink' ? 'text-ink/70' : 'text-paper/70',
        className,
      )}
    >
      [ {index} / {label} ]
    </p>
  );
}
