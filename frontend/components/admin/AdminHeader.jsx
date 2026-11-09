"use client";

import { usePathname } from "next/navigation";
import ThemeToggle from "./ThemeToggle";
import { ADMIN_MENU_ITEMS } from "@/constants/menuItems";
import { useAuth } from "@/lib/auth-context";

// Header bar untuk halaman Admin (judul halaman aktif, theme toggle, dan profil pengguna).
export default function AdminHeader() {
  const pathname = usePathname();
  const { user } = useAuth();

  const currentItem = ADMIN_MENU_ITEMS.find(
    (item) => pathname === item.href || pathname?.startsWith(item.href + "/")
  );
  const pageTitle = currentItem?.label || "Admin";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-[var(--neutral-border)] bg-[var(--neutral-surface)]">
      <h1 className="text-base font-semibold text-[var(--text-primary)]">{pageTitle}</h1>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-xs font-semibold">
          {user?.name?.[0]?.toUpperCase() || "A"}
        </div>
      </div>
    </header>
  );
}
