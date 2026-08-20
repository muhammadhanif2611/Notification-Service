"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Theme toggle component untuk switch antara Light dan Dark mode.
 * Persist preference ke localStorage dan apply .dark class ke <html>.
 * 
 * @returns {JSX.Element}
 */
export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  /**
   * Initialize theme dari localStorage atau system preference.
   * Hanya run di client-side setelah hydration.
   */
  useEffect(() => {
    setMounted(true);
    
    // Baca preference dari localStorage
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && systemPrefersDark);
    
    // Sync DOM dengan preference
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    
    setIsDark(shouldBeDark);
  }, []);

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
