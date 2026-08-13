"use client";

import { usePathname } from "next/navigation";
import { Search, Bell, LogOut } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { ADMIN_MENU_ITEMS } from "@/constants/menuItems";
import { useAuth } from "@/lib/auth-context";

/**
 * AdminHeader — Top header bar untuk Platform Admin.
 * Sesuai DESIGN.md: sticky top-0 z-10, judul halaman, environment badge, queue latency, theme switcher, notifikasi.
 * @returns {JSX.Element}
 */
export default function AdminHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  // Resolve current page title from menu items
  const currentItem = ADMIN_MENU_ITEMS.find(
    (item) => pathname === item.href || pathname?.startsWith(item.href + "/")
  );
  const pageTitle = currentItem?.label || "Admin";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-[var(--neutral-border)] bg-[var(--neutral-surface)]">
      {/* Left: Page Title + Environment */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-[var(--text-primary)]">{pageTitle}</h1>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
          PROD
        </span>
      </div>

      {/* Right: Search, Latency, Theme, Notifications, User */}
      <div className="flex items-center gap-2">
        {/* Search shortcut */}
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--neutral-border)] text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
          <Search size={14} />
          <span>Search...</span>
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono">
            ⌘K
          </kbd>
        </button>

        {/* Queue Latency */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-[var(--neutral-border)]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-mono font-medium text-[var(--text-secondary)]">
            12ms
          </span>
        </div>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Notifikasi"
        >
          <Bell size={16} />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
        </button>

        {/* User Avatar */}
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-xs font-semibold">
          {user?.name?.[0]?.toUpperCase() || "A"}
        </div>

        {/* Logout Button */}
        <button
          onClick={logout}
          className="flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-surface)] text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          aria-label="Logout"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
