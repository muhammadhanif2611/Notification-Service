"use client";

import { useState, useSyncExternalStore } from "react";
import { Sun, Moon } from "lucide-react";

// Deteksi client-side mount tanpa setState di effect (menghindari hydration mismatch)
const subscribe = () => () => {};
const useMounted = () => useSyncExternalStore(subscribe, () => true, () => false);

// Baca tema awal dari localStorage / system preference (client-only)
function getInitialTheme() {
  if (typeof window === "undefined") return false;
  const savedTheme = localStorage.getItem("theme");
  return savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

/**
 * Theme toggle component untuk switch antara Light dan Dark mode.
 * Persist preference ke localStorage dan apply .dark class ke <html>.
 *
 * @returns {JSX.Element}
 */
export default function ThemeToggle() {
  const mounted = useMounted();
  // Lazy initializer — tanpa effect, tanpa setState sinkron
  const [isDark, setIsDark] = useState(getInitialTheme);

  /**
   * Toggle antara dark dan light mode.
   * Update state, DOM, dan localStorage secara bersamaan.
   */
  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    
    // Update DOM class
    if (newTheme) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    // Persist ke localStorage
    localStorage.setItem("theme", newTheme ? "dark" : "light");
  };

  // Prevent hydration mismatch dengan render placeholder sampai mounted
  if (!mounted) {
    return (
      <button
        className="flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-surface)] text-[var(--text-secondary)]"
        aria-label="Loading theme"
        disabled
      >
        <Moon size={16} />
      </button>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
