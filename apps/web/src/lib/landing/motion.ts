import type { Variants } from 'framer-motion';

export const revealUp: Variants = {
  hidden: { y: 16, opacity: 0 },
  show: {
    y: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

export const revealLeft: Variants = {
  hidden: { x: -16, opacity: 0 },
  show: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

export const stagger = (childDelay = 0.06): Variants => ({
  hidden: {},
  show: {
    transition: {
      staggerChildren: childDelay,
    },
  },
});

export const slamDown = {
  whileHover: { x: 4, y: 4, boxShadow: '2px 2px 0 0 #0A0A0A' },
  transition: { duration: 0.12, ease: [0.2, 0.8, 0.2, 1] },
};

export const viewportOnce = { once: true, amount: 0.15 };
