"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Loader2 } from "lucide-react";

// Deteksi client-side mount tanpa setState di effect (menghindari hydration mismatch)
const subscribe = () => () => {};
const useMounted = () => useSyncExternalStore(subscribe, () => true, () => false);

/**
 * AuthGuard — Melindungi route yang membutuhkan autentikasi.
 * Redirect ke /login jika belum login, atau ke halaman sesuai role jika role tidak cocok.
 * @param {object} props
 * @param {React.ReactNode} props.children
 * @param {"admin"|"user"} [props.requiredRole] - Role yang dibutuhkan (opsional)
 * @returns {JSX.Element|null}
 */
export default function AuthGuard({ children, requiredRole }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const mounted = useMounted();

  useEffect(() => {
    if (!mounted || loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (requiredRole === "admin" && user.role !== "admin") {
      router.replace("/client");
    }
    if (requiredRole === "user" && user.role === "admin") {
      router.replace("/admin/control-center");
    }
  }, [user, loading, requiredRole, router, mounted]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--neutral-bg)]">
        <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (!user) return null;
  if (requiredRole === "admin" && user.role !== "admin") return null;
  if (requiredRole === "user" && user.role === "admin") return null;

  return children;
}
