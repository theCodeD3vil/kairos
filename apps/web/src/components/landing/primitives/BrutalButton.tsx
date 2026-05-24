import { forwardRef, type ButtonHTMLAttributes, type AnchorHTMLAttributes } from 'react';
import { cn } from '@/lib/landing/cn';

type Variant = 'primary' | 'outline' | 'inverse';

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-ink text-paper border-ink shadow-brutal hover:bg-signal hover:text-ink active:translate-x-[6px] active:translate-y-[6px] active:shadow-none',
  outline:
    'bg-paper text-ink border-ink shadow-brutal hover:bg-ink hover:text-paper active:translate-x-[6px] active:translate-y-[6px] active:shadow-none',
  inverse:
    'bg-paper text-ink border-paper shadow-brutal-inverse hover:bg-signal hover:text-ink hover:border-ink active:translate-x-[6px] active:translate-y-[6px] active:shadow-none',
};

type BaseProps = {
  variant?: Variant;
  className?: string;
  children: React.ReactNode;
};

type BrutalButtonProps = BaseProps & ButtonHTMLAttributes<HTMLButtonElement> & { as?: 'button' };
type BrutalAnchorProps = BaseProps & AnchorHTMLAttributes<HTMLAnchorElement> & { as: 'a' };

const buttonBase =
  'inline-flex items-center justify-center gap-2 border-2 rounded-brutal px-6 py-3 font-display text-sm font-bold uppercase tracking-wider transition-[transform,box-shadow,background-color,color] [transition-duration:120ms] ease-slam hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-brutal-sm';

export const BrutalButton = forwardRef<HTMLButtonElement, BrutalButtonProps>(
  ({ variant = 'primary', className, children, ...rest }, ref) => (
    <button
      ref={ref}
      className={cn(buttonBase, variantClasses[variant], className)}
      {...rest}
    >
      {children}
    </button>
  ),
);
BrutalButton.displayName = 'BrutalButton';

export const BrutalAnchor = forwardRef<HTMLAnchorElement, BrutalAnchorProps>(
  ({ variant = 'primary', className, children, as: _as, ...rest }, ref) => (
    <a
      ref={ref}
      className={cn(buttonBase, variantClasses[variant], className)}
      {...rest}
    >
      {children}
    </a>
  ),
);
BrutalAnchor.displayName = 'BrutalAnchor';
