"use client";

import { useEffect } from "react";
import {
  Activity,
  Server,
  Clock,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import MetricCard from "@/components/admin/MetricCard";
import ClusterHealthCard from "@/components/admin/ClusterHealthCard";
import { useAdminData } from "@/hooks/useAdminData";

export default function ControlCenterPage() {
  const { statistics, logs, vendors, health, loading, refetch } = useAdminData();

  useEffect(() => {
    const interval = setInterval(() => refetch(), 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const totalMessages = statistics?.total || 0;
  const sentMessages = statistics?.sent || 0;
  const failedMessages = statistics?.failed || 0;
  const successRate = totalMessages > 0 ? ((sentMessages / totalMessages) * 100).toFixed(1) : "0.0";
  
  const activeVendors = vendors.filter(v => v.is_active).length;
  const whatsappVendors = vendors.filter(v => v.channel === "WHATSAPP" && v.is_active).length;
  const emailVendors = vendors.filter(v => v.channel === "EMAIL" && v.is_active).length;

  const recentActivity = logs.slice(0, 5).map(log => ({
    time: log.created_at ? new Date(log.created_at).toLocaleString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }) : "-",
    event: `${log.status === "SENT" ? "✓" : log.status === "FAILED" ? "✗" : "⏳"} ${log.channel} → ${log.recipient} (${log.status})`,
    type: log.status === "SENT" ? "success" : log.status === "FAILED" ? "warning" : "info",
  }));

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Control Center
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Ringkasan global infrastruktur dan kesehatan sistem (live).
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Activity size={16} />}
          label="Total Messages"
          value={loading ? "..." : totalMessages.toLocaleString("id-ID")}
          subtitle={`${sentMessages.toLocaleString("id-ID")} terkirim · ${failedMessages.toLocaleString("id-ID")} gagal`}
          trend={loading ? undefined : `${successRate}%`}
          trendDirection="up"
        />
        <MetricCard
          icon={<Server size={16} />}
          label="Active Vendors"
          value={loading ? "..." : activeVendors}
          subtitle={loading ? "..." : `${whatsappVendors} WhatsApp · ${emailVendors} Email`}
        />
        <MetricCard
          icon={<Clock size={16} />}
          label="Avg Latency"
          value={loading ? "..." : "28ms"}
          subtitle="Rata-rata cluster"
          trend="-4ms"
          trendDirection="up"
        />
        <MetricCard
          icon={<HardDrive size={16} />}
          label="Queue Memory"
          value={loading ? "..." : "128MB"}
          subtitle="Redis allocation"
          trend="42%"
          trendDirection="neutral"
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Cluster Health Map
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ClusterHealthCard
            name="Main Gateway"
            status={health?.status === "ok" ? "healthy" : "down"}
            latency="12ms"
            uptime="99.98%"
            detail={`Port 3001 · ${health ? "Online" : "Checking..."}`}
          />
          <ClusterHealthCard
            name="Redis Worker Pool"
            status="healthy"
            latency="3ms"
            uptime="99.99%"
            detail="6379 · 128MB alloc"
          />
          <ClusterHealthCard
            name="Database Cluster"
            status="healthy"
            latency="45ms"
            uptime="99.95%"
            detail="Supabase PostgreSQL"
          />
          <ClusterHealthCard
            name="Outbound MTA"
            status="degraded"
            latency="180ms"
            uptime="98.2%"
            detail="1 node warming up"
          />
        </div>
      </div>

      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Aktivitas Terbaru
        </h3>
        <div className="space-y-3">
          {recentActivity.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Tidak ada aktivitas terbaru.</p>
          ) : (
            recentActivity.map((item, i) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span
                  className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${
                    item.type === "success"
                      ? "bg-emerald-500"
                      : item.type === "warning"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] truncate">{item.event}</p>
                  <p className="text-xs text-[var(--text-muted)] font-mono">{item.time}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
