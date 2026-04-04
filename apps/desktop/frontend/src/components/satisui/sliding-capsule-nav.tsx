import { motion } from 'motion/react';
import type { ReactNode } from 'react';

export type NavTab = {
  title: string;
  url: string;
  icon?: ReactNode;
};

type SlidingCapsuleNavProps = {
  tabs: NavTab[];
  currentTab: string;
  onChange: (url: string) => void;
  layoutId?: string;
  className?: string;
};

export function SlidingCapsuleNav({
  tabs,
  currentTab,
  onChange,
  layoutId = 'capsule-nav',
  className,
}: SlidingCapsuleNavProps) {
  const navClassName = `inline-flex items-center rounded-full bg-[#e7ebea] p-1 ${className ?? ''}`.trim();

  return (
    <nav className={navClassName}>
      {tabs.map((tab) => {
        const active = currentTab === tab.url;

        return (
          <button
            key={tab.url}
            type="button"
            onClick={() => onChange(tab.url)}
            className="relative flex items-center rounded-full px-4 py-2 text-sm font-medium"
          >
            {active && (
              <motion.div
                layoutId={`${layoutId}-active`}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                className="absolute inset-0 z-0 rounded-full bg-primary"
              />
            )}

            {!active && (
              <motion.div
                layoutId={`${layoutId}-hover`}
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                className="absolute inset-0 z-0 rounded-full bg-transparent hover:bg-white/70"
              />
            )}

            <span className={`relative z-20 flex items-center gap-2 ${active ? 'text-white' : 'text-[#1e3f44]'}`}>
              {tab.icon}
              <span>{tab.title}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
