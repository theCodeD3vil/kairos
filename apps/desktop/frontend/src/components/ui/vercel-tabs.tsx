"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";

interface TabData {
  label: string;
  value: string;
  content: React.ReactNode;
}

interface VercelTabsProps {
  tabs: TabData[];
  defaultTab?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  stickyTabList?: boolean;
}

export function VercelTabs({ tabs, defaultTab, value, onValueChange, className, stickyTabList = false }: VercelTabsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [internalTab, setInternalTab] = useState(defaultTab || tabs[0]?.value);
  const activeTab = value ?? internalTab;
  const [hoverStyle, setHoverStyle] = useState({});
  const [activeStyle, setActiveStyle] = useState({ left: "0px", width: "0px" });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const setActiveTab = (next: string) => {
    setInternalTab(next);
    onValueChange?.(next);
  };

  const activeIndex = tabs.findIndex((tab) => tab.value === activeTab);

  useEffect(() => {
    if (hoveredIndex !== null) {
      const hoveredElement = tabRefs.current[hoveredIndex];
      if (hoveredElement) {
        const { offsetLeft, offsetWidth } = hoveredElement;
        setHoverStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        });
      }
    }
  }, [hoveredIndex]);

  useEffect(() => {
    const activeElement = tabRefs.current[activeIndex];
    if (activeElement) {
      const { offsetLeft, offsetWidth } = activeElement;
      setActiveStyle({
        left: `${offsetLeft}px`,
        width: `${offsetWidth}px`,
      });
    }
  }, [activeIndex]);

  useEffect(() => {
    requestAnimationFrame(() => {
      const activeElement = tabRefs.current[activeIndex];
      if (activeElement) {
        const { offsetLeft, offsetWidth } = activeElement;
        setActiveStyle({
          left: `${offsetLeft}px`,
          width: `${offsetWidth}px`,
        });
      }
    });
  }, [activeIndex]);

  return (
    <div className={`flex w-full flex-col items-center ${className}`}>
      <div className={`w-full ${stickyTabList ? 'sticky top-0 z-20 bg-[var(--surface)] pb-2' : ''}`}>
        <div className="relative mx-auto flex h-auto w-fit select-none items-center gap-[6px] bg-transparent p-0">
        {/* Hover Highlight */}
        <div
          className="pointer-events-none absolute top-0 left-0 flex h-8 items-center rounded-[6px] bg-[var(--ink-void)14] transition-all duration-300 ease-out"
          style={{
            ...hoverStyle,
            opacity: hoveredIndex !== null ? 1 : 0,
          }}
        />

        {/* Active Indicator */}
        <div
          className="pointer-events-none absolute bottom-[-6px] h-[2px] bg-[var(--ink-void)] transition-all duration-300 ease-out"
          style={activeStyle}
        />

        {tabs.map((tab, index) => (
          <button
            key={tab.value}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            className={`z-10 flex h-8 items-center justify-center cursor-pointer rounded-md border-0 bg-transparent px-3 py-0 outline-none transition-colors duration-300 focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:bg-transparent data-[state=active]:shadow-none ${
              activeTab === tab.value
                ? "text-[var(--ink-void)]"
                : "text-[var(--ink-void)99]"
            }`}
            onClick={() => setActiveTab(tab.value)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <span className="whitespace-nowrap font-medium text-sm leading-5">
              {tab.label}
            </span>
          </button>
        ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="mt-8 w-full px-4">
        {tabs
          .filter((tab) => tab.value === activeTab)
          .map((tab) => (
            <div
              key={tab.value}
              className="fade-in-50 w-full animate-in duration-500"
            >
              {tab.content}
            </div>
          ))}
      </div>
    </div>
  );
}
