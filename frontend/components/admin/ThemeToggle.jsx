"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Theme toggle component — switches between Light and Dark mode.
 * Persists preference to localStorage and applies .dark class to <html>.
 * @returns {JSX.Element}
 */
export default function ThemeToggle() {
  // null = belum ter-hydrate (menunggu baca kondisi DOM di client)
  const [isDark, setIsDark] = useState(null);

  // Baca kondisi awal dari class pada <html> (di-set oleh inline script di layout.js)
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  const toggle = () => {
    const root = document.documentElement;
    const next = !(isDark === true);
    if (next) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", next ? "dark" : "light");
    setIsDark(next);
  };

  return (
    <button
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
