"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_MENU_ITEMS } from "@/constants/menuItems";
import {
  LayoutDashboard,
  FolderKanban,
  Activity,
  Server,
  Shield,
  Mail,
  Users,
  UserX,
  AlertTriangle,
  MessageSquare,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { SidebarBrand } from "@/components/shared/CifoLogo";

const ICON_MAP = {
  LayoutDashboard: LayoutDashboard,
  FolderKanban: FolderKanban,
  Activity: Activity,
  Server: Server,
  Shield: Shield,
  Mail: Mail,
  Users: Users,
  UserX: UserX,
  AlertTriangle: AlertTriangle,
  MessageSquare: MessageSquare,
};

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 shrink-0 sticky top-0 h-screen flex flex-col border-r border-[var(--neutral-border)] bg-[var(--neutral-surface)]">
      <SidebarBrand role="admin" />

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {ADMIN_MENU_ITEMS.map((item) => {
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
      </nav>      <div className="px-4 py-4 border-t border-[var(--neutral-border)] space-y-3">        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-xs font-semibold shrink-0">
            {(user?.email || "A")[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-[var(--text-primary)] truncate">
              {user?.email || "Admin"}
            </p>
            <p className="text-[10px] text-[var(--text-muted)] capitalize">
              {user?.role || "admin"}
            </p>
          </div>
        </div>        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[var(--text-secondary)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          aria-label="Logout"
        >
          <LogOut size={14} />
          Keluar
        </button>
      </div>
    </aside>
  );
}
