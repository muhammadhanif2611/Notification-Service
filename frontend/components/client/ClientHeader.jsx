"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import ThemeToggle from "@/components/admin/ThemeToggle";
import { CLIENT_MENU_ITEMS } from "@/constants/menuItems";
import { useAuth } from "@/lib/auth-context";

/**
 * ClientHeader — Top header untuk Client User dashboard.
 * DESIGN.md: sticky, page title, environment badge, theme switcher, notifikasi.
 * @returns {JSX.Element}
 */
export default function ClientHeader() {
  const pathname = usePathname();
  const { user } = useAuth();

  const currentItem = CLIENT_MENU_ITEMS.find(
    (item) => pathname === item.href || pathname?.startsWith(item.href + "/")
  );
  const pageTitle = currentItem?.label || "Dashboard";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-[var(--neutral-border)] bg-[var(--neutral-surface)]">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-[var(--text-primary)]">{pageTitle}</h1>
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
          PROD
        </span>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          aria-label="Notifikasi"
        >
          <Bell size={16} />
        </button>
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-xs font-semibold">
          {(user?.email || "U")[0].toUpperCase()}
        </div>
      </div>
    </header>
  );
}
