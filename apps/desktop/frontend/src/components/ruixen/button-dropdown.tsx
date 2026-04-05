import * as React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/utils';

export interface DropdownItem {
  label: string;
  onClick?: () => void;
  destructive?: boolean;
}

export interface ButtonDropdownProps {
  label: string;
  items: DropdownItem[];
  className?: string;
}

export function ButtonDropdown({ label, items, className }: ButtonDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="inline-flex items-center gap-2 rounded-[10px] border border-black/8 bg-[var(--glass-light)] px-3 py-1.5 text-xs font-medium text-[var(--ink-strong-alt)] shadow-[var(--shadow-glass)] backdrop-blur-[20px]"
      >
        <span>{label}</span>
        <motion.svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          className="text-black/45"
        >
          <path d="M6 9l6 6 6-6" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[180px] rounded-xl border border-black/8 bg-[var(--glass-light-strong)] p-1 shadow-[var(--shadow-layered)] backdrop-blur-[20px]"
          >
            {items.map((item) => (
              <motion.button
                key={item.label}
                type="button"
                onClick={() => {
                  item.onClick?.();
                  setOpen(false);
                }}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={cn(
                  'flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-black/5',
                  item.destructive ? 'text-red-500' : 'text-[var(--ink-strong-alt)]',
                )}
              >
                {item.label}
              </motion.button>
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
