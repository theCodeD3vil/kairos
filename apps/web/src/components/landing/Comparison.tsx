import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { viewportOnce } from '@/lib/landing/motion';

const ROWS = [
  {
    label: 'Local activity history',
    detail: 'Your coding activity is kept on your computer by default.',
  },
  {
    label: 'No account required',
    detail: 'Start using the desktop app without sign-up, email, or subscription setup.',
  },
  {
    label: 'Open codebase',
    detail: 'Read the source, file issues, propose changes, or adapt it for your own workflow.',
  },
  {
    label: 'Exportable records',
    detail: 'Keep your history portable so you can back it up, move it, or remove it.',
  },
  {
    label: 'Desktop and editor workflow',
    detail: 'Use the desktop app and editor integration together for a local view of your time.',
  },
  {
    label: 'Free releases',
    detail: 'Kairos is free and open source, with releases published in the open.',
  },
];

export function Comparison() {
  return (
    <section className="relative bg-paper text-ink py-28 md:py-36 px-6 md:px-10 grid-overlay overflow-hidden">
      <div className="mx-auto max-w-7xl">
        <h2 className="font-display font-extrabold text-[clamp(40px,7vw,96px)] leading-[0.95] tracking-tight max-w-4xl">
          An open source alternative.
        </h2>

        <div className="mt-16 md:mt-20 overflow-x-auto">
          <table className="w-full border-collapse min-w-[640px]">
            <thead>
              <tr>
                <th className="text-left py-4 px-4 border-b-2 border-ink font-display font-bold text-lg">
                  Kairos choice
                </th>
                <th className="text-left py-4 px-4 border-b-2 border-ink font-display font-bold text-lg">
                  What it means
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r, i) => (
                <motion.tr
                  key={r.label}
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={viewportOnce}
                  transition={{ duration: 0.35, ease: 'easeOut', delay: i * 0.08 }}
                  className="border-b border-ink/15"
                >
                  <td className="py-4 px-4 font-display text-base font-bold">
                    <span className="inline-flex items-center gap-3">
                      <Check className="h-5 w-5 stroke-[3px] text-signal" />
                      {r.label}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-sans text-sm text-ink/70">{r.detail}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
