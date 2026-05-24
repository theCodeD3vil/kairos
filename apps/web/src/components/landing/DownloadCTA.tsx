import { Download } from 'lucide-react';
import { RELEASES_URL } from '@/lib/landing/constants';

const PLATFORMS = [
  { os: 'macOS', ext: '.dmg', href: RELEASES_URL },
  { os: 'Linux', ext: '.AppImage', href: RELEASES_URL },
];

function PlatformButton({ os, ext, href }: { os: string; ext: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative flex flex-col w-full sm:w-auto"
    >
      <span className="inline-flex w-full sm:w-auto items-center justify-center gap-3 bg-ink text-paper border-2 border-ink rounded-brutal shadow-brutal px-6 sm:px-8 py-4 sm:py-5 font-display font-bold text-lg sm:text-xl uppercase tracking-wider transition-[transform,box-shadow,background-color,color] [transition-duration:120ms] ease-slam hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-brutal-sm hover:bg-signal hover:text-ink">
        {os}
        <Download className="h-5 w-5" />
      </span>
      <span className="mt-3 text-center font-display text-xs font-bold text-ink/40 opacity-0 -translate-y-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-y-0">
        {ext}
      </span>
    </a>
  );
}

export function DownloadCTA() {
  return (
    <section
      id="download"
      className="relative bg-paper text-ink py-24 sm:py-32 md:py-44 px-6 md:px-10 grid-overlay overflow-hidden"
    >
      <div className="mx-auto max-w-5xl text-center space-y-8 sm:space-y-10">
        <h2 className="font-display font-extrabold text-[clamp(44px,11vw,160px)] leading-[0.9] tracking-tight">
          Try Kairos today.
        </h2>
        <p className="font-display font-bold text-xl sm:text-2xl md:text-3xl text-ink/70">
          Free. Open. Yours.
        </p>

        <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-4 sm:gap-6 md:gap-8 pt-4 sm:pt-6">
          {PLATFORMS.map((p) => (
            <PlatformButton key={p.os} {...p} />
          ))}
        </div>

        <p className="font-sans text-sm text-ink/50 pt-6 sm:pt-8">
          Free forever. Made for people who do their best work in peace.
        </p>
      </div>
    </section>
  );
}
