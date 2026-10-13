"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MessageSquare, RefreshCw, Wifi, WifiOff, Unplug } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";
import { useToast } from "@/lib/toast-context";

const STATUS_STYLE = {
  CONNECTED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  WAITING_QR: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  CONNECTING: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  DISCONNECTED: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const STATUS_LABEL = {
  CONNECTED: "Terhubung",
  WAITING_QR: "Menunggu Scan QR",
  CONNECTING: "Menghubungkan...",
  DISCONNECTED: "Terputus",
};

export default function AdminWaSessionsPage() {
  const toast = useToast();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(null);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const lastFetchTimeRef = useRef(0);

  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet("/v1/admin/wa-sessions");
      setSessions(res.data || []);
      setError(null);
      lastFetchTimeRef.current = Date.now();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch saat halaman dimuat
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Tab visibility trigger: refresh saat pengguna kembali ke tab (cooldown 30s)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const elapsed = Date.now() - lastFetchTimeRef.current;
        if (elapsed >= 30000) {
          fetchSessions();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchSessions]);

  // Controlled auto-refresh (hanya saat user mengaktifkannya dan tab aktif)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchSessions();
      }
    }, 20000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchSessions]);

  const handleDisconnect = async (projectId, projectName) => {
    if (!confirm(`Putuskan sesi WhatsApp project "${projectName}"?`)) return;
    setDisconnecting(projectId);
    try {
      await apiPost(`/v1/admin/wa-sessions/${projectId}/disconnect`, {});
      await fetchSessions();
    } catch (err) {
      toast.error("Gagal memutuskan sesi: " + err.message);
    } finally {
      setDisconnecting(null);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">WhatsApp Sessions</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Monitoring seluruh sesi WhatsApp per-project. Client mengelola sesi mereka sendiri — admin hanya bisa memantau dan force-disconnect.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              autoRefresh
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
                : "border border-[var(--neutral-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {autoRefresh ? "Auto-refresh (20s) ON" : "Auto-refresh OFF"}
          </button>
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-sm">
          Gagal memuat data sesi: {error}
        </div>
      )}

      <div className="mt-6 rounded-xl border border-[var(--neutral-border)] bg-[var(--neutral-surface)] overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--neutral-border)]">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <MessageSquare size={18} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="font-semibold text-[var(--text-primary)]">Semua Sesi Project</h3>
        </div>

        {loading && sessions.length === 0 ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-[var(--text-muted)]">
            <RefreshCw size={16} className="animate-spin" />
            Memuat data sesi...
          </div>
        ) : sessions.length === 0 ? (
          <div className="py-16 text-center text-sm text-[var(--text-muted)]">
            Belum ada project terdaftar.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--neutral-border)] text-left">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Project</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Terhubung Sejak</th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.projectId} className="border-b border-[var(--neutral-border)] last:border-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-[var(--text-primary)]">{s.projectName}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[s.status] || STATUS_STYLE.DISCONNECTED}`}>
                      {s.status === "CONNECTED" ? <Wifi size={12} /> : <WifiOff size={12} />}
                      {STATUS_LABEL[s.status] || s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[var(--text-secondary)]">
                    {s.connectedAt ? new Date(s.connectedAt).toLocaleString("id-ID") : "-"}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {s.status === "CONNECTED" && (
                      <button
                        onClick={() => handleDisconnect(s.projectId, s.projectName)}
                        disabled={disconnecting === s.projectId}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition-colors"
                      >
                        <Unplug size={14} />
                        {disconnecting === s.projectId ? "Memutuskan..." : "Putuskan"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
