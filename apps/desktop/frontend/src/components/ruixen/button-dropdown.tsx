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
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = React.useState<React.CSSProperties>({
    top: 'calc(100% + 6px)',
    left: 0,
    maxHeight: 320,
    minWidth: 180,
  });

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

  React.useLayoutEffect(() => {
    if (!open) return;

    const updateMenuLayout = () => {
      const trigger = ref.current;
      if (!trigger) return;

      const viewportPadding = 8;
      const dropdownGap = 6;
      const triggerRect = trigger.getBoundingClientRect();
      const minWidth = Math.max(180, Math.ceil(triggerRect.width));
      const measuredMenuHeight = menuRef.current?.offsetHeight ?? 260;
      const measuredMenuWidth = menuRef.current?.offsetWidth ?? minWidth;

      const availableBelow = Math.max(96, window.innerHeight - triggerRect.bottom - dropdownGap - viewportPadding);
      const availableAbove = Math.max(96, triggerRect.top - dropdownGap - viewportPadding);
      const openAbove = availableBelow < 180 && availableAbove > availableBelow;
      const maxHeight = openAbove ? availableAbove : availableBelow;
      const alignRight = triggerRect.left + measuredMenuWidth > window.innerWidth - viewportPadding;

      setMenuStyle({
        top: openAbove ? undefined : `calc(100% + ${dropdownGap}px)`,
        bottom: openAbove ? `calc(100% + ${dropdownGap}px)` : undefined,
        left: alignRight ? undefined : 0,
        right: alignRight ? 0 : undefined,
        minWidth,
        maxHeight: Math.min(Math.max(160, maxHeight), measuredMenuHeight),
      });
    };

    updateMenuLayout();
    const raf = window.requestAnimationFrame(updateMenuLayout);
    window.addEventListener('resize', updateMenuLayout);
    window.addEventListener('scroll', updateMenuLayout, true);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize', updateMenuLayout);
      window.removeEventListener('scroll', updateMenuLayout, true);
    };
  }, [open, items.length]);

  return (
    <div ref={ref} className={cn('relative inline-block', className)}>
      <motion.button
        type="button"
        onClick={() => setOpen((v) => !v)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="inline-flex items-center gap-2 rounded-[10px] border border-[hsl(var(--border)/0.65)] [background:var(--glass-light)] px-3 py-1.5 text-xs font-medium text-[var(--ink-strong-alt)] shadow-[var(--shadow-glass)] backdrop-blur-[20px]"
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
          className="text-[var(--ink-tertiary)]"
        >
          <path d="M6 9l6 6 6-6" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            style={menuStyle}
            className="absolute z-50 overflow-y-auto overflow-x-hidden rounded-xl border border-[hsl(var(--border)/0.65)] [background:var(--glass-light-strong)] p-1 shadow-[var(--shadow-layered)] backdrop-blur-[20px] supports-[backdrop-filter]:bg-[hsl(var(--popover)/0.68)]"
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
                  'flex w-full items-center rounded-lg px-2.5 py-2 text-left text-xs transition-colors hover:bg-[var(--surface-subtle)]',
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
