import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { type DateRange, RangeCalendar } from '@/components/ruixen/range-calendar';
import { cn } from '@/lib/utils';

type DateRangePickerProps = {
  value: DateRange | null;
  onChange: (value: DateRange | null) => void;
  label?: string;
  active?: boolean;
  className?: string;
};

export function DateRangePicker({
  value,
  onChange,
  label = 'Custom',
  active = false,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayLabel = useMemo(() => {
    if (!value) return label;
    const from = value.start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const to = value.end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    return `${from} - ${to}`;
  }, [value, label]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors',
          active
            ? 'border-transparent bg-secondary text-secondary-foreground'
            : 'border-black/10 bg-[#dfe4e2] text-[#2e3f43] hover:bg-[#d5dbd8]',
        )}
      >
        {displayLabel}
        {value ? (
          <span
            role="button"
            aria-label="Clear date range"
            onClick={(event) => {
              event.stopPropagation();
              onChange(null);
              setOpen(false);
            }}
            className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-primary/70 transition-colors hover:bg-primary/15 hover:text-primary"
          >
            <X className="h-3 w-3" />
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-50 rounded-xl border border-black/10 bg-white/90 p-3 shadow-[0_10px_30px_rgba(0,0,0,0.12)] backdrop-blur">
          <RangeCalendar
            value={value}
            sound={false}
            onChange={(nextRange) => {
              onChange(nextRange);
              if (nextRange) setOpen(false);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
