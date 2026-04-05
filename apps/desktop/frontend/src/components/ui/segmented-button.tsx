"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface SegmentedButtonItem {
  id: string;
  label?: React.ReactNode;
  title?: string;
}

interface SegmentedButtonProps {
  buttons?: SegmentedButtonItem[];
  options?: Array<{ label: React.ReactNode; value: string; title?: string }>;
  defaultActive?: string;
  value?: string;
  onChange?: (activeId: string) => void;
  className?: string;
  size?: 'sm' | 'md';
  tone?: 'neutral' | 'primary';
}

function SegmentedButton({
  buttons,
  options,
  defaultActive,
  value,
  onChange,
  className = "",
  size = 'md',
  tone = 'neutral',
}: SegmentedButtonProps) {
  const normalizedButtons =
    options?.map((option) => ({ id: option.value, label: option.label, title: option.title })) ?? buttons ?? [];

  const [activeButton, setActiveButton] = useState(
    value || defaultActive || normalizedButtons[0]?.id || "",
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
    const activeIndex = normalizedButtons.findIndex((btn) => btn.id === activeButton);
    const activeElement = buttonRefs.current[activeIndex];
    if (!activeElement) return;

    setIndicatorStyle({
      left: activeElement.offsetLeft,
      width: activeElement.offsetWidth,
    });
  }, [activeButton, normalizedButtons]);

  const handleButtonClick = (buttonId: string) => {
    setActiveButton(buttonId);
    onChange?.(buttonId);
  };

  return (
    <div
      className={`relative inline-flex items-center rounded-full ${tone === 'primary' ? 'bg-primary/15' : 'bg-[var(--surface-chip)]'} ${size === 'sm' ? 'p-0.5' : 'p-1'} ${className}`}
      role="group"
    >
      <motion.div
        className={`absolute top-1 bottom-1 z-0 rounded-full ${tone === 'primary' ? 'bg-primary' : 'bg-secondary'}`}
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

      {normalizedButtons.map((button, index) => {
        const active = activeButton === button.id;

        return (
          <button
            key={button.id}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            onClick={() => handleButtonClick(button.id)}
            title={button.title ?? (typeof button.label === 'string' ? button.label : undefined)}
            className={`relative z-10 rounded-full transition-colors ${
              size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-1.5 text-sm'
            }`}
          >
            <span
              className={`inline-block max-w-[140px] overflow-hidden text-ellipsis whitespace-nowrap ${
                active
                  ? tone === 'primary'
                    ? 'text-primary-foreground'
                    : 'text-secondary-foreground'
                  : tone === 'primary'
                    ? 'text-primary'
                    : 'text-[var(--ink-accent)]'
              }`}
            >
              {typeof button.label === 'string' ? button.label : <span className="inline-flex items-center gap-1.5">{button.label}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export { SegmentedButton };
export default SegmentedButton;
