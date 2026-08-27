"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Activity, CheckCircle, Clock, Webhook, Zap, Key, ArrowRight } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import MetricCard from "@/components/shared/MetricCard";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { apiGet } from "@/lib/api";
import { useProjectContext } from "@/lib/project-context";

const CHANNEL_COLORS = { WHATSAPP: "#10B981", EMAIL: "#3B82F6", SMS: "#8B5CF6" };

/**
 * ClientDashboardPage — Overview untuk Client User (DESIGN.md 6A.1).
 * Data dari GET /v1/statistics dan GET /v1/logs lewat gateway.
 */
export default function ClientDashboardPage() {
  const { activeProject } = useProjectContext();
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!activeProject?.id) { setLoading(false); return; }
    setLoading(true);
    try {
      const [statsRes, logsRes] = await Promise.allSettled([
        apiGet(`/v1/statistics?projectId=${activeProject.id}`),
        apiGet(`/v1/logs?projectId=${activeProject.id}&limit=5`),
      ]);
      if (statsRes.status === "fulfilled") setStats(statsRes.value?.data || null);
      if (logsRes.status === "fulfilled") {
        const d = logsRes.value?.data;
        setRecentLogs(Array.isArray(d) ? d : d?.data || []);
      }
    } catch {
      // Service belum berjalan — tampilkan empty state
    } finally {
      setLoading(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchData();
    })();
    return () => { cancelled = true; };
  }, [fetchData]);

  const totalSent = stats?.total_sent ?? stats?.total ?? 0;
  const successRate = stats?.success_rate ?? 0;
  const avgLatency = stats?.avg_latency_ms ?? 0;
  const trendData = stats?.daily_trend || [];
  const channelData = stats?.channel_breakdown
    ? Object.entries(stats.channel_breakdown).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Dashboard</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Ringkasan pengiriman notifikasi Anda.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/client/api-keys" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
            <Key size={14} /> Buat API Key
          </Link>
          <Link href="/client/webhook" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors">
            <Zap size={14} /> Test Broadcast
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<Activity size={16} />} label="Total Terkirim" value={loading ? "..." : totalSent.toLocaleString("id-ID")} subtitle="24 jam terakhir" />
        <MetricCard icon={<CheckCircle size={16} />} label="Success Rate" value={loading ? "..." : `${successRate}%`} subtitle="Delivery rate" />
        <MetricCard icon={<Clock size={16} />} label="Avg Latency" value={loading ? "..." : `${avgLatency}ms`} subtitle="Rata-rata dispatch" />
        <MetricCard icon={<Webhook size={16} />} label="Webhook Status" value="200 OK" subtitle="Endpoint aktif" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Tren Pengiriman Harian</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <Tooltip contentStyle={{ backgroundColor: "var(--neutral-surface)", border: "1px solid var(--neutral-border)", borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="delivered" stroke="#10B981" strokeWidth={2} dot={false} name="Delivered" />
                <Line type="monotone" dataKey="queued" stroke="#F59E0B" strokeWidth={2} dot={false} name="Queued" />
                <Line type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={2} dot={false} name="Failed" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="Belum ada data tren" description="Grafik tren pengiriman akan muncul setelah ada data statistik." />
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

      {/* Recent Logs */}
      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--neutral-border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Aktivitas Terakhir</h3>
          <Link href="/client/riwayat" className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
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
    </>
  );
}
