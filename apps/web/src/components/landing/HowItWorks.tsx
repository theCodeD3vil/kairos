import { Fragment } from 'react';
import { motion } from 'framer-motion';
import { viewportOnce } from '@/lib/landing/motion';

const STEPS = [
  {
    n: 1,
    title: 'A quiet companion.',
    body: 'Kairos works alongside you while you build. No setup rituals. No interruptions.',
    tilt: -2,
  },
  {
    n: 2,
    title: 'A private memory.',
    body: 'Your activity history stays on your computer, ready to inspect, back up, or remove.',
    tilt: 0,
  },
  {
    n: 3,
    title: 'A clearer week.',
    body: 'See where your hours go. Spot the streaks. Understand your own rhythm.',
    tilt: 2,
  },
];

function ArrowConnector() {
  return (
    <svg
      className="hidden md:block w-full h-12"
      viewBox="0 0 200 40"
      preserveAspectRatio="none"
      aria-hidden
    >
      <line
        x1="0"
        y1="20"
        x2="200"
        y2="20"
        stroke="#0A0A0A"
        strokeWidth="2"
        strokeDasharray="4 4"
      />
      {/* <polygon points="195,14 200,20 195,26" fill="#0A0A0A" /> */}
      <circle r="4" fill="#FF4D1C">
        <animateMotion dur="3s" repeatCount="indefinite" path="M 0 20 L 200 20" />
      </circle>
    </svg>
  );
}

export function HowItWorks() {
  return (
    <section className="relative bg-paper text-ink py-28 md:py-36 md:px-12 px-6 grid-overlay overflow-hidden">
      <div className="mx-auto  text-center">
        <h2 className="font-display font-extrabold text-[clamp(40px,7vw,96px)] leading-[0.95] tracking-tight">
          Three pieces. Local data.
        </h2>

        <div className="mt-16 md:mt-20 gap-6 grid md:grid-cols-[1fr_auto_1fr_auto_1fr]  items-stretch text-left">
          {STEPS.map((s, i) => (
            <Fragment key={s.n}>
              <motion.div
                initial={{ opacity: 0, y: 24, rotate: 0 }}
                whileInView={{ opacity: 1, y: 0, rotate: s.tilt }}
                viewport={viewportOnce}
                transition={{ duration: 0.5, ease: 'easeOut', delay: i * 0.1 }}
                className="bg-paper border-[3px] border-ink rounded-brutal shadow-brutal p-6 md:p-8 flex flex-col"
              >
                <p className="font-display font-extrabold text-5xl text-signal">{s.n}</p>
                <h3 className="mt-4 font-display font-bold text-2xl md:text-3xl leading-tight">
                  {s.title}
                </h3>
                <p className="mt-3 font-sans text-ink/75 text-sm md:text-base leading-relaxed">
                  {s.body}
                </p>
              </motion.div>
              {i < STEPS.length - 1 && (
                <div className="flex items-center justify-center">
                  <ArrowConnector />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
