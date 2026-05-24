import { cn } from '@/lib/landing/cn';

type Props = {
  className?: string;
  color?: 'ink' | 'paper' | 'signal';
  size?: number;
};

const stroke: Record<NonNullable<Props['color']>, string> = {
  ink: '#0A0A0A',
  paper: '#F5F2EC',
  signal: '#FF4D1C',
};

export function Crosshair({ className, color = 'ink', size = 14 }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      className={cn('shrink-0', className)}
      aria-hidden
    >
      <line x1="7" y1="0" x2="7" y2="14" stroke={stroke[color]} strokeWidth="1.5" />
      <line x1="0" y1="7" x2="14" y2="7" stroke={stroke[color]} strokeWidth="1.5" />
      <circle cx="7" cy="7" r="2" fill="none" stroke={stroke[color]} strokeWidth="1.5" />
    </svg>
  );
}
