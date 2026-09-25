"use client";

import { toggleTheme } from "@/lib/theme";

export function ThemeToggle() {
  return (
    <button
      type="button"
      className="cfo-theme-toggle"
      aria-label="Switch between night and day"
      onClick={toggleTheme}
    >
      <span className="cfo-theme-toggle-night">Night</span>
      <span className="cfo-theme-toggle-paper">Day</span>
    </button>
  );
}
