import { NAV_LINKS } from '@/lib/landing/constants';
import kairosMarkUrl from '@/assets/kairos-mark.svg';

export function Nav() {
  return (
    <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 md:px-10 py-6 md:py-8">
      <a
        href="#top"
        className="inline-flex items-center gap-2 font-display text-2xl md:text-3xl font-bold tracking-tight"
      >
        <img
          src={kairosMarkUrl}
          alt="Kairos logo"
          data-testid="kairos-nav-logo"
          className="h-8 w-8 md:h-9 md:w-9"
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
    </nav>
  );
}
