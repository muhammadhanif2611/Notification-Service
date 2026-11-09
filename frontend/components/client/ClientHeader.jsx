"use client";

import { usePathname } from "next/navigation";
import ThemeToggle from "@/components/admin/ThemeToggle";
import { CLIENT_MENU_ITEMS } from "@/constants/menuItems";
import { useAuth } from "@/lib/auth-context";

// Header bar untuk halaman Client (judul halaman aktif, theme toggle, dan profil pengguna).
export default function ClientHeader() {
  const pathname = usePathname();
  const { user } = useAuth();

  const currentItem = CLIENT_MENU_ITEMS.find(
    (item) => pathname === item.href || pathname?.startsWith(item.href + "/")
  );
  const pageTitle = currentItem?.label || "Dashboard";

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-[var(--neutral-border)] bg-[var(--neutral-surface)]">
      <h1 className="text-base font-semibold text-[var(--text-primary)]">{pageTitle}</h1>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <div className="flex items-center justify-center w-9 h-9 rounded-full bg-[var(--primary)] text-[var(--on-primary)] text-xs font-semibold">
          {(user?.email || "U")[0].toUpperCase()}
        </div>
      </div>
    </header>
  );
}
