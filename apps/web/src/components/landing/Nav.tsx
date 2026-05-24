import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { NAV_LINKS } from '@/lib/landing/constants';
import kairosMarkUrl from '@/assets/kairos-mark.svg';

export function Nav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <nav className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-6 md:px-10 py-5 md:py-8">
      <a
        href="#top"
        className="inline-flex items-center gap-2 font-display text-xl sm:text-2xl md:text-3xl font-bold tracking-tight"
      >
        <img
          src={kairosMarkUrl}
          alt="Kairos logo"
          data-testid="kairos-nav-logo"
          className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9"
        />
        <span>KAIROS</span>
      </a>

      <ul className="hidden md:flex items-center gap-8 font-display text-sm font-bold">
        {NAV_LINKS.map((l) => (
          <li key={l.label}>
            <a
              href={l.href}
              className="hover:text-kairos-cyan transition-colors duration-150"
              target={l.href.startsWith('http') ? '_blank' : undefined}
              rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>

      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-menu"
        onClick={() => setOpen((v) => !v)}
        className="md:hidden inline-flex h-11 w-11 items-center justify-center rounded-brutal border-[3px] border-ink bg-paper text-ink shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-[transform,box-shadow] [transition-duration:120ms]"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="mobile-menu"
            id="mobile-menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="md:hidden fixed inset-0 z-20 bg-ink/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: -16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -16, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={(e) => e.stopPropagation()}
              className="absolute top-[88px] left-4 right-4 bg-paper border-[3px] border-ink rounded-brutal shadow-brutal-lg p-4"
            >
              <ul className="flex flex-col gap-1 font-display text-base font-bold">
                {NAV_LINKS.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="block px-4 py-3 rounded-brutal border-2 border-transparent hover:border-ink hover:bg-signal transition-colors"
                      target={l.href.startsWith('http') ? '_blank' : undefined}
                      rel={l.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
