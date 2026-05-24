import { Fragment } from 'react';
import { cn } from '@/lib/landing/cn';

const WORDS_A = ['Open source', 'Yours to keep', 'Local by default', 'Quietly there', 'Built in the open'];
const WORDS_B = ['Free forever', 'On your computer', 'Made for builders', 'A small calm app', 'Use it your way'];

function Diamond() {
  return (
    <span className="inline-block h-3 w-3 rotate-45 bg-signal mx-6 align-middle" aria-hidden />
  );
}

function Row({ words, direction }: { words: string[]; direction: 'left' | 'right' }) {
  const track = [...words, ...words];
  return (
    <div className="overflow-hidden border-y-2 border-paper py-5 group">
      <div
        className={cn(
          'flex items-center whitespace-nowrap font-display font-extrabold text-3xl md:text-5xl tracking-tight',
          direction === 'left' ? 'animate-marquee-left' : 'animate-marquee-right',
          'group-hover:[animation-play-state:paused]',
        )}
      >
        {track.map((w, i) => (
          <Fragment key={i}>
            <span>{w}</span>
            <Diamond />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

export function DemoMarquee() {
  return (
    <section className="relative bg-ink text-paper py-4">
      <Row words={WORDS_A} direction="left" />
      <Row words={WORDS_B} direction="right" />
    </section>
  );
}
