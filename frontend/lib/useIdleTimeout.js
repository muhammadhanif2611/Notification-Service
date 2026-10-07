"use client";

import { useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

// Durasi idle sebelum auto-logout (30 menit)
export const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
// Key localStorage untuk sinkronisasi aktivitas antar-tab
const LAST_ACTIVITY_KEY = "ngw_last_activity";

// Event DOM yang dianggap sebagai aktivitas user (passive agar tidak ganggu performa)
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];

/**
 * useIdleTimeout — Auto-logout setelah user tidak aktif selama IDLE_TIMEOUT_MS.
 *
 * Murni client-side: TIDAK ada polling ke server/Redis, sehingga tidak menambah
 * request sama sekali. Aktivitas dicatat di localStorage (timestamp) sehingga
 * tersinkron antar-tab — aktif di tab manapun me-reset timer di semua tab.
 *
 * @param {object} [options]
 * @param {number} [options.timeout] - Override durasi idle (ms), default 30 menit
 */
export function useIdleTimeout({ timeout = IDLE_TIMEOUT_MS } = {}) {
  const { token, logout } = useAuth();
  const router = useRouter();
  const timerRef = useRef(null);

  const clearSessionAndRedirect = useCallback(() => {
    // Bersihkan sesi tanpa memicu router.push di dalam logout (kita redirect manual
    // dengan query reason agar halaman login bisa menampilkan pesan yang tepat)
    logout();
    router.replace("/login?reason=idle");
  }, [logout, router]);

  useEffect(() => {
    // Hanya aktif jika user sudah login
    if (!token) return;

    const touch = () => {
      try {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      } catch {
        // abaikan jika storage tidak tersedia
      }
    };

    const getLastActivity = () => {
      try {
        return parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || "0", 10) || Date.now();
      } catch {
        return Date.now();
      }
    };

    // Cek berkala (bukan reset timer di tiap event — hemat CPU):
    // timer dijadwalkan ulang berdasarkan last-activity, bukan di-clear tiap event.
    const scheduleCheck = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const elapsed = Date.now() - getLastActivity();
      const remaining = timeout - elapsed;

      if (remaining <= 0) {
        clearSessionAndRedirect();
        return;
      }
      timerRef.current = setTimeout(scheduleCheck, remaining);
    };

    // Throttle penulisan aktivitas: maksimal 1x per 5 detik per tab
    let lastTouch = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastTouch < 5000) return;
      lastTouch = now;
      touch();
    };

    // Saat tab kembali terlihat, langsung cek — kalau sudah lewat batas, logout
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && Date.now() - getLastActivity() > timeout) {
        clearSessionAndRedirect();
      }
    };

    // Sinkron antar-tab: kalau tab lain logout (sesi dihapus), tab ini ikut
    const handleStorage = (e) => {
      if (e.key === "ngw_token" && !e.newValue) {
        router.replace("/login?reason=idle");
      }
    };

    touch(); // tandai sesi ini aktif saat mount
    scheduleCheck();

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, handleActivity, { passive: true });
    }
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("storage", handleStorage);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, handleActivity);
      }
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("storage", handleStorage);
    };
  }, [token, timeout, clearSessionAndRedirect, router]);
}
