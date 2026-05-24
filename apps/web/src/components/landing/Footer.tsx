import { FOOTER_LINKS } from '@/lib/landing/constants';
import kairosMarkUrl from '@/assets/kairos-mark.svg';

export function Footer() {
  return (
    <footer className="relative bg-ink text-paper pt-12 sm:pt-16 pb-8 px-6 md:px-10">
      <div className="mx-auto max-w-7xl flex flex-col md:flex-row md:items-end justify-between gap-8 sm:gap-10">
        <div>
          <div className="inline-flex items-center gap-3">
            <img
              src={kairosMarkUrl}
              alt=""
              aria-hidden
              data-testid="kairos-footer-logo"
              className="h-8 w-8 sm:h-9 sm:w-9"
            />
            <p className="font-display font-extrabold text-2xl sm:text-3xl md:text-4xl tracking-tight">KAIROS</p>
          </div>
          <p className="mt-2 font-sans text-paper/70 text-sm max-w-xs">
            An open source alternative for tracking coding time locally.
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-6 sm:gap-x-8 gap-y-3 font-display text-sm font-bold">
          {FOOTER_LINKS.map((l) => (
            <li key={l.label}>
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-signal transition-colors"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="mx-auto max-w-7xl mt-10 sm:mt-12 pt-4 border-t border-signal/80 font-sans text-xs text-paper/50">
        © Kairos. Open source and made in the open.
      </div>
    </footer>
  );
}
