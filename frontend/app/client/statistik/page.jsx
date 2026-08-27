"use client";

import { useState, useEffect, useCallback } from "react";
import { Activity, CheckCircle, XCircle, Clock } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import MetricCard from "@/components/shared/MetricCard";
import EmptyState from "@/components/shared/EmptyState";
import { apiGet } from "@/lib/api";

const CHANNEL_COLORS = { WHATSAPP: "#10B981", EMAIL: "#3B82F6", SMS: "#8B5CF6" };
const STATUS_COLORS = { delivered: "#10B981", queued: "#F59E0B", failed: "#EF4444" };
const TT = { backgroundColor: "var(--neutral-surface)", border: "1px solid var(--neutral-border)", borderRadius: 8, fontSize: 12 };
const TICK = { fontSize: 11, fill: "var(--text-muted)" };

/** StatistikPage â€” Grafik statistik pengiriman (Recharts, DESIGN.md 6A). */
export default function StatistikPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("7d");

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet(`/v1/statistics?range=${range}`);
      setStats(res?.data || null);
    } catch { setStats(null); } finally { setLoading(false); }
  }, [range]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchStats();
    })();
    return () => { cancelled = true; };
  }, [fetchStats]);

  const trend = stats?.daily_trend || [];
  const channels = stats?.channel_breakdown
    ? Object.entries(stats.channel_breakdown).map(([name, value]) => ({ name, value })) : [];
  const statuses = stats?.status_breakdown
    ? Object.entries(stats.status_breakdown).map(([name, value]) => ({ name, value })) : [];

  const rangeBtn = (r) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
      range === r ? "bg-[var(--primary)] text-[var(--on-primary)]"
        : "border border-[var(--neutral-border)] text-[var(--text-secondary)] hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Statistik</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Analisis performa pengiriman notifikasi.</p>
        </div>
        <div className="flex gap-1.5">
          {[["7d", "7 Hari"], ["14d", "14 Hari"], ["30d", "30 Hari"]].map(([r, label]) => (
            <button key={r} onClick={() => setRange(r)} className={rangeBtn(r)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard icon={<Activity size={16} />} label="Total Terkirim" value={loading ? "..." : (stats?.total_sent ?? 0).toLocaleString("id-ID")} subtitle={`${range} terakhir`} />
        <MetricCard icon={<CheckCircle size={16} />} label="Delivered" value={loading ? "..." : (stats?.delivered ?? 0).toLocaleString("id-ID")} subtitle="Berhasil terkirim" />
        <MetricCard icon={<XCircle size={16} />} label="Failed" value={loading ? "..." : (stats?.failed ?? 0).toLocaleString("id-ID")} subtitle="Gagal terkirim" />
        <MetricCard icon={<Clock size={16} />} label="Avg Latency" value={loading ? "..." : `${stats?.avg_latency_ms ?? 0}ms`} subtitle="Rata-rata" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Tren Pengiriman</h3>
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-border)" />
                <XAxis dataKey="date" tick={TICK} />
                <YAxis tick={TICK} />
                <Tooltip contentStyle={TT} />
                <Line type="monotone" dataKey="delivered" stroke={STATUS_COLORS.delivered} strokeWidth={2} dot={false} name="Delivered" />
                <Line type="monotone" dataKey="queued" stroke={STATUS_COLORS.queued} strokeWidth={2} dot={false} name="Queued" />
                <Line type="monotone" dataKey="failed" stroke={STATUS_COLORS.failed} strokeWidth={2} dot={false} name="Failed" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="Belum ada data" description="Grafik akan muncul setelah ada data statistik." />
          )}
        </div>

        <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Channel Breakdown</h3>
          {channels.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={channels} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {channels.map((e) => (<Cell key={e.name} fill={CHANNEL_COLORS[e.name] || "#A1A1AA"} />))}
                </Pie>
                <Tooltip />
                <Legend formatter={(v) => <span className="text-xs text-[var(--text-secondary)]">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState title="Belum ada data" description="Distribusi channel akan muncul di sini." />
          )}
        </div>
      </div>

      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Status Breakdown</h3>
        {statuses.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={statuses}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--neutral-border)" />
              <XAxis dataKey="name" tick={TICK} />
              <YAxis tick={TICK} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {statuses.map((e) => (<Cell key={e.name} fill={STATUS_COLORS[e.name?.toLowerCase()] || "#A1A1AA"} />))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title="Belum ada data" description="Breakdown status akan muncul di sini." />
        )}
      </div>
    </>
  );
}
