"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CLIENT_MENU_ITEMS } from "@/constants/menuItems";
import { LayoutDashboard, Clock, BarChart2, Key, Webhook, Zap, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const ICON_MAP = {
  LayoutDashboard, Clock, BarChart2, Key, Webhook,
};

/**
 * ClientSidebar — Sidebar navigasi untuk Client User (Developer Portal).
 * Sesuai DESIGN.md: 240px, sticky, border-first, client badge.
 * @returns {JSX.Element}
 */
export default function ClientSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 shrink-0 sticky top-0 h-screen flex flex-col border-r border-[var(--neutral-border)] bg-[var(--neutral-surface)]">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-[var(--neutral-border)]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--primary)]">
            <Zap size={16} className="text-[var(--on-primary)]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)] leading-tight">Notification</p>
            <p className="text-[10px] text-[var(--text-muted)] leading-tight">Gateway</p>
          </div>
        </div>
        <div className="mt-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-[var(--client-badge-bg)] text-[var(--client-badge-text)]">
            Client
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {CLIENT_MENU_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const IconComponent = ICON_MAP[item.icon] || LayoutDashboard;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-zinc-100 dark:bg-zinc-800 text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              }`}
            >
              <IconComponent size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="px-4 py-4 border-t border-[var(--neutral-border)] space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-xs font-semibold shrink-0">
            {(user?.email || "U")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[var(--text-primary)] truncate">{user?.email || "User"}</p>
            <p className="text-[10px] text-[var(--text-muted)] capitalize">{user?.role || "client"}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          <LogOut size={14} />
          Keluar
        </button>
      </div>
    </aside>
  );
}
