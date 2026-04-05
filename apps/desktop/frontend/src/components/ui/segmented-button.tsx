"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface SegmentedButtonItem {
  id: string;
  label?: string | null;
  title?: string;
}

interface SegmentedButtonProps {
  buttons: SegmentedButtonItem[];
  defaultActive?: string;
  value?: string;
  onChange?: (activeId: string) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export default function SegmentedButton({
  buttons,
  defaultActive,
  value,
  onChange,
  className = "",
  size = 'md',
}: SegmentedButtonProps) {
  const [activeButton, setActiveButton] = useState(
    value || defaultActive || buttons[0]?.id || "",
  );
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (value) setActiveButton(value);
  }, [value]);

  useEffect(() => {
    if (!value && defaultActive) setActiveButton(defaultActive);
  }, [defaultActive, value]);

  useEffect(() => {
    const activeIndex = buttons.findIndex((btn) => btn.id === activeButton);
    const activeElement = buttonRefs.current[activeIndex];
    if (!activeElement) return;

    setIndicatorStyle({
      left: activeElement.offsetLeft,
      width: activeElement.offsetWidth,
    });
  }, [activeButton, buttons]);

  const handleButtonClick = (buttonId: string) => {
    setActiveButton(buttonId);
    onChange?.(buttonId);
  };

  return (
    <div
      className={`relative inline-flex items-center rounded-full bg-[var(--surface-chip)] ${size === 'sm' ? 'p-0.5' : 'p-1'} ${className}`}
      role="group"
    >
      <motion.div
        className="absolute top-1 bottom-1 z-0 rounded-full bg-secondary"
        animate={{
          left: indicatorStyle.left,
          width: indicatorStyle.width,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 32,
        }}
      />

      {buttons.map((button, index) => {
        const active = activeButton === button.id;

        return (
          <button
            key={button.id}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            onClick={() => handleButtonClick(button.id)}
            title={button.title ?? button.label ?? undefined}
            className={`relative z-10 rounded-full transition-colors ${
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'
            }`}
          >
            <span
              className={`inline-block max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap ${
                active ? 'text-secondary-foreground' : 'text-[var(--ink-accent)]'
              }`}
            >
              {button.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
