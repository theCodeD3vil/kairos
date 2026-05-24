import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const REAL_LABEL = 'Currently';
const REAL_VALUE = 'Working on a passion project';
const HIDDEN_VALUE = 'Something personal';

function RedactCard() {
  const [showReal, setShowReal] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => setShowReal((v) => !v), 2400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative">
      <div
        className="absolute inset-0 translate-x-3 translate-y-3 bg-signal rounded-brutal -z-10"
        aria-hidden
      />
      <div className="bg-paper text-ink border-[3px] border-ink rounded-brutal shadow-brutal-lg overflow-hidden">
        <div className="px-6 py-8 space-y-6">
          <div>
            <p className="font-display text-sm font-bold text-ink/50 uppercase tracking-widest">
              {REAL_LABEL}
            </p>
            <div className="mt-3 min-h-[3.5rem] flex items-center">
              <motion.p
                key={showReal ? 'real' : 'hidden'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="font-display text-3xl md:text-4xl font-bold leading-tight"
              >
                {showReal ? REAL_VALUE : HIDDEN_VALUE}
              </motion.p>
            </div>
          </div>
          <div className="pt-4 border-t-2 border-ink/15">
            <div className="flex items-center gap-3">
              <span
                className={`h-3 w-3 rounded-full ${
                  showReal ? 'bg-ink' : 'bg-signal animate-pulse-signal'
                }`}
              />
              <p className="font-display font-bold text-base">
                {showReal ? 'On your screen' : 'Just for you'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Privacy() {
  return (
    <section
      id="privacy"
      className="relative bg-paper text-ink py-28 md:py-36 px-6 md:px-10 grid-overlay overflow-hidden"
    >
      <div className="mx-auto max-w-7xl grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
        <div className="space-y-6">
          <h2 className="font-display font-extrabold text-[clamp(36px,5.5vw,80px)] leading-[0.95] tracking-tight">
            Your data never leaves home.
          </h2>
          <ul className="space-y-5 font-sans text-ink/80 max-w-lg text-base md:text-lg">
            <li>
              <strong className="font-bold text-ink">Stays with you.</strong> Everything Kairos sees
              stays on your computer, where you can review it, back it up, or remove it.
            </li>
            <li>
              <strong className="font-bold text-ink">No accounts to make.</strong> Nothing to log
              into. No subscription. No email. Just open it and go.
            </li>
            <li>
              <strong className="font-bold text-ink">You choose what to share.</strong> Hide
              anything you'd rather keep to yourself. Or pause it whenever you want.
            </li>
            <li>
              <strong className="font-bold text-ink">Yours to keep.</strong> Your history belongs to
              you. Take it with you, back it up, or wipe it clean. Always your call.
            </li>
          </ul>
        </div>
        <RedactCard />
      </div>
    </section>
  );
}
