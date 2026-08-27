"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

/**
 * HomePage — Root page. Redirect berdasarkan auth state:
 * - Belum login → /login
 * - Admin → /control-center
 * - User → /client
 * @returns {JSX.Element}
 */
export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (user.role === "admin") {
      router.replace("/admin/control-center");
    } else {
      router.replace("/client");
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--neutral-bg)]">
      <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
    </div>
  );
}
