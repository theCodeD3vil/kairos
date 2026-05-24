import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/landing/cn';

type Size = 'sm' | 'md' | 'lg';
type Tone = 'paper' | 'ink' | 'signal';

const sizeClasses: Record<Size, string> = {
  sm: 'border-2 p-5 rounded-brutal',
  md: 'border-[3px] p-6 rounded-brutal',
  lg: 'border-4 p-8 rounded-brutal',
};

const toneClasses: Record<Tone, string> = {
  paper: 'bg-paper text-ink border-ink shadow-brutal',
  ink: 'bg-ink text-paper border-paper shadow-brutal-inverse',
  signal: 'bg-signal text-ink border-ink shadow-brutal',
};

type Props = HTMLAttributes<HTMLDivElement> & {
  size?: Size;
  tone?: Tone;
};

export const BrutalCard = forwardRef<HTMLDivElement, Props>(
  ({ size = 'md', tone = 'paper', className, children, ...rest }, ref) => (
    <div
      ref={ref}
      className={cn(sizeClasses[size], toneClasses[tone], className)}
      {...rest}
    >
      {children}
    </div>
  ),
);
BrutalCard.displayName = 'BrutalCard';
