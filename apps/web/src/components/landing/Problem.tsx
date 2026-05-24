import { motion } from 'framer-motion';
import { viewportOnce } from '@/lib/landing/motion';
import { SquigglyText } from './primitives/SquigglyText';

const CARDS = [
  {
    title: 'Quiet by design.',
    body: 'A small, calm tool that runs alongside you while you work and stays out of the way.',
  },
  {
    title: 'Yours from the start.',
    body: "Everything Kairos remembers stays on your computer. It's the simplest place for it to live.",
  },
  {
    title: 'Open, end to end.',
    body: 'Free and open source. Read every line, shape it to your taste, or take it with you.',
  },
];

export function Problem() {
  return (
    <section className="relative bg-ink text-paper py-28 md:py-36 px-6 md:px-10 overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <h2 className="font-display font-extrabold text-[clamp(40px,7vw,96px)] leading-[0.95] tracking-tight max-w-4xl">
          Built on a few simple <SquigglyText>ideas.</SquigglyText>
        </h2>

        <div className="mt-16 md:mt-20 grid md:grid-cols-3 gap-6 md:gap-8">
          {CARDS.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={viewportOnce}
              transition={{ duration: 0.4, ease: 'easeOut', delay: i * 0.08 }}
              className="relative border-2 border-paper rounded-brutal p-6 bg-ink"
            >
              <h3 className="font-display font-bold text-2xl md:text-3xl leading-tight">
                {c.title}
              </h3>
              <p className="mt-5 font-sans text-paper/75 text-base leading-relaxed">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
