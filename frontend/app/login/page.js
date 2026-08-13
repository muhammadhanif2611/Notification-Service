"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Zap, Eye, EyeOff, Loader2 } from "lucide-react";

/**
 * LoginPage — Halaman login dashboard.
 * Sesuai IMPLEMENTATION_PLAN Fase 7: Login via auth-service lewat gateway.
 * DESIGN.md: Clean, border-first, token-based, support dark mode.
 * @returns {JSX.Element}
 */
export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err.message || "Login gagal. Periksa email dan password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--neutral-bg)] px-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--primary)]">
            <Zap size={22} className="text-[var(--on-primary)]" />
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Notification Gateway</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              Masuk ke dashboard untuk melanjutkan
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-[var(--status-failed-bg)] border border-[#FECACA] dark:border-red-900 text-[var(--status-failed-text)] text-xs">
              <span className="mt-0.5 shrink-0">&#x2716;</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
                className="w-full px-3 py-2.5 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-shadow"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="login-password"
                className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 pr-10 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-shadow"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Memproses..." : "Masuk"}
            </button>
          </form>

          {/* Info: akun dibuat oleh admin */}
          <p className="text-center text-[11px] text-[var(--text-muted)] leading-relaxed px-2">
            Belum punya akun? Hubungi admin platform untuk dibuatkan kredensial login.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[var(--text-muted)]">
          Notification Gateway Platform &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
