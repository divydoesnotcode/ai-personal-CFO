"use client";

import type { ElementType } from "react";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: ElementType;
}

export function ResponsiveTabs<T extends string>({
  tabs,
  activeTab,
  onChange,
  ariaLabel = "Navigation tabs",
}: {
  tabs: TabItem<T>[];
  activeTab: T;
  onChange: (tabId: T) => void;
  ariaLabel?: string;
}) {
  return (
    <nav className="dash-settings-tabs no-print" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`dash-settings-tab ${isActive ? "active" : ""}`}
            onClick={() => onChange(tab.id)}
            aria-current={isActive ? "page" : undefined}
          >
            {Icon ? <Icon size={14} /> : null}
            {tab.label}
          </button>
        );
      })}
    </nav>
  );
}
