"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Activity, CheckCircle, XCircle, Clock, Zap, Key, ArrowRight, RefreshCw } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import MetricCard from "@/components/shared/MetricCard";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import Alert from "@/components/shared/Alert";
import { apiGet } from "@/lib/api";
import { useProjectContext } from "@/lib/project-context";

const CHANNEL_COLORS = { WHATSAPP: "#10B981", EMAIL: "#3B82F6" };
const STATUS_COLORS = {
  sent: "#10B981",
  delivered: "#10B981",
  read: "#10B981",
  queued: "#F59E0B",
  pending: "#F59E0B",
  processing: "#3B82F6",
  failed: "#EF4444",
};
const RANGES = [["7d", "7 Hari"], ["14d", "14 Hari"], ["30d", "30 Hari"]];
const TOOLTIP_STYLE = { backgroundColor: "var(--neutral-surface)", border: "1px solid var(--neutral-border)", borderRadius: 8, fontSize: 12 };
const TICK = { fontSize: 11, fill: "var(--text-muted)" };

// Dashboard Client: ringkasan metrik, tren pengiriman per rentang waktu, distribusi channel/status, dan aktivitas terakhir.
export default function ClientDashboardPage() {
  const { activeProject, loading: projectLoading } = useProjectContext();
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [range, setRange] = useState("7d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const projectId = activeProject?.id;

  const fetchData = useCallback(async (opts = {}) => {
    if (projectLoading) return;
    if (!projectId) {
      setStats(null);
      setRecentLogs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const [statsRes, logsRes] = await Promise.allSettled([
      apiGet(`/v1/statistics?projectId=${projectId}&range=${range}`, opts),
      apiGet(`/v1/logs?projectId=${projectId}&limit=5`, opts),
    ]);

    if (statsRes.status === "fulfilled") {
      setStats(statsRes.value?.stats || statsRes.value?.data || null);
    } else {
      setStats(null);
      setError(statsRes.reason?.message || "Gagal memuat statistik pengiriman dari server.");
    }

    if (logsRes.status === "fulfilled") {
      const d = logsRes.value?.data;
      setRecentLogs(Array.isArray(d) ? d : d?.data || []);
    } else {
      setRecentLogs([]);
      if (statsRes.status === "fulfilled") {
        setError(logsRes.reason?.message || "Gagal memuat riwayat aktivitas terbaru.");
      }
    }
    setLoading(false);
  }, [projectId, projectLoading, range]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchData();
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchData]);

  const isLoading = projectLoading || loading;
  const total = stats?.total ?? 0;
  const delivered = stats?.delivered ?? 0;
  const failed = stats?.failed ?? 0;
  const successRate = stats?.success_rate ?? 0;
  const avgLatency = stats?.avg_latency_ms ?? 0;
  const trendData = stats?.daily_trend || [];
  const hasTrendActivity = trendData.some((d) => d.delivered > 0 || d.queued > 0 || d.failed > 0);
  const channelData = stats?.channel_breakdown
    ? Object.entries(stats.channel_breakdown).map(([name, value]) => ({ name, value }))
    : [];
  const statusData = stats?.status_breakdown
    ? Object.entries(stats.status_breakdown).map(([name, value]) => ({ name, value }))
    : [];
  const rangeLabel = RANGES.find(([r]) => r === range)?.[1];

  const rangeBtn = (r) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
      range === r
        ? "bg-[var(--primary)] text-[var(--on-primary)]"
        : "border border-[var(--neutral-border)] text-[var(--text-secondary)] hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
    }`;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-semibold text-[var(--text-primary)]">Dashboard</h2>
            {activeProject?.name && (
              <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-[var(--client-badge-bg)] text-[var(--client-badge-text)]">
                {activeProject.name}
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Ringkasan dan analisis pengiriman notifikasi project Anda.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => fetchData({ skipDedupe: true })}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-50 dark:hover:bg-zinc-800/50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} /> Refresh
          </button>
          <Link
            href="/client/api-keys"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <Key size={14} /> Buat API Key
          </Link>
          <Link
            href="/client/broadcast"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Zap size={14} /> Test Broadcast
          </Link>
        </div>
      </div>

      {error && (
        <Alert variant="error" title="Koneksi Backend Terputus">
          {error} Pastikan seluruh layanan backend (<code className="font-mono">npm run dev</code>) berjalan normal.
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<Activity size={16} />} label="Total Pesan" value={isLoading ? "..." : total.toLocaleString("id-ID")} subtitle="Seluruh pesan project" />
        <MetricCard icon={<CheckCircle size={16} />} label="Berhasil" value={isLoading ? "..." : delivered.toLocaleString("id-ID")} subtitle={`Success rate ${successRate}%`} />
        <MetricCard icon={<XCircle size={16} />} label="Gagal" value={isLoading ? "..." : failed.toLocaleString("id-ID")} subtitle="Pesan gagal terkirim" />
        <MetricCard icon={<Clock size={16} />} label="Avg Latency" value={isLoading ? "..." : `${avgLatency}ms`} subtitle={`${rangeLabel} terakhir`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tren Pengiriman Harian</h3>
            <div className="flex gap-1.5">
              {RANGES.map(([r, label]) => (
                <button key={r} onClick={() => setRange(r)} className={rangeBtn(r)}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {hasTrendActivity ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-border)" />
                <XAxis dataKey="date" tick={TICK} />
                <YAxis tick={TICK} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="delivered" stroke={STATUS_COLORS.delivered} strokeWidth={2} dot={false} name="Delivered" />
                <Line type="monotone" dataKey="queued" stroke={STATUS_COLORS.queued} strokeWidth={2} dot={false} name="Queued" />
                <Line type="monotone" dataKey="failed" stroke={STATUS_COLORS.failed} strokeWidth={2} dot={false} name="Failed" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="Belum ada data tren" description="Grafik tren pengiriman akan muncul setelah ada pengiriman." />
          )}
        </div>

        <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Channel Breakdown</h3>
          {channelData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={channelData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {channelData.map((entry) => (
                    <Cell key={entry.name} fill={CHANNEL_COLORS[entry.name] || "#A1A1AA"} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend formatter={(v) => <span className="text-xs text-[var(--text-secondary)]">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="Belum ada data channel" description="Distribusi channel akan muncul setelah ada pengiriman." />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Status Breakdown</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-border)" />
                <XAxis dataKey="name" tick={TICK} />
                <YAxis tick={TICK} />
                <Tooltip contentStyle={TOOLTIP_STYLE} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {statusData.map((entry) => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name?.toLowerCase()] || "#A1A1AA"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="Belum ada data status" description="Breakdown status akan muncul setelah ada pengiriman." />
          )}
        </div>

        <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--neutral-border)]">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Aktivitas Terakhir</h3>
            <Link
              href="/client/riwayat"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              Lihat Semua <ArrowRight size={12} />
            </Link>
          </div>
          {recentLogs.length > 0 ? (
            <div className="divide-y divide-[var(--neutral-border)]">
              {recentLogs.map((log) => (
                <div key={log.id || log.message_id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-[var(--text-muted)] shrink-0">{log.channel || "—"}</span>
                    <span className="text-sm text-[var(--text-primary)] truncate">{log.recipient || log.message_id || "—"}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={log.status} />
                    <span className="text-[11px] font-mono text-[var(--text-muted)]">
                      {log.created_at ? new Date(log.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Belum ada aktivitas" description="Log pengiriman terakhir akan muncul di sini." />
          )}
        </div>
      </div>
    </>
  );
}
