"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

interface SegmentedButtonItem {
  id: string;
  label?: string | null;
}

interface SegmentedButtonProps {
  buttons: SegmentedButtonItem[];
  defaultActive?: string;
  value?: string;
  onChange?: (activeId: string) => void;
  className?: string;
}

export default function SegmentedButton({
  buttons,
  defaultActive,
  value,
  onChange,
  className = "",
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
      className={`relative inline-flex items-center rounded-full bg-[#dfe4e2] p-1 ${className}`}
      role="group"
    >
      <motion.div
        className="absolute top-1 bottom-1 z-0 rounded-full bg-primary shadow-[0_1px_3px_rgba(0,0,0,0.22)]"
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
            className="relative z-10 rounded-full px-4 py-1.5 text-sm transition-colors"
          >
            <span className={active ? "text-white" : "text-[#2e3f43]"}>
              {button.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
