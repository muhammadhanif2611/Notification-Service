"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Activity,
  Server,
  Clock,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import MetricCard from "@/components/shared/MetricCard";
import ClusterHealthCard from "@/components/admin/ClusterHealthCard";
import { useAdminData } from "@/hooks/useAdminData";
import { apiGet } from "@/lib/api";

// Pemetaan node cluster: key layanan -> nama tampilan di kartu health
const SERVICE_LABELS = {
  AUTH: "Auth Service",
  CLIENT: "Client Service",
  NOTIFICATION: "Notification Service",
  CALLBACK_LOG: "Callback & Log Service",
  DISPATCH: "Dispatch Service",
};

export default function ControlCenterPage() {
  const { statistics, logs, vendors, loading, refetch } = useAdminData();
  const [cluster, setCluster] = useState(null);

  const fetchCluster = useCallback(async () => {
    const [healthRes, queueRes] = await Promise.allSettled([
      apiGet("/v1/admin/cluster-health", { skipDedupe: true }),
      apiGet("/v1/admin/queue-metrics", { skipDedupe: true }),
    ]);
    if (healthRes.status === "fulfilled" && queueRes.status === "fulfilled") {
      setCluster({ ...healthRes.value?.data, ...queueRes.value?.data });
    } else if (healthRes.status === "fulfilled") {
      setCluster(healthRes.value?.data || null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await fetchCluster(); })();
    return () => { cancelled = true; };
  }, [fetchCluster]);

  // Refresh data di-handle via trigger: initial mount, tombol Refresh (manual),
  // dan Tab Visibility trigger saat tab aktif kembali (useAdminData).

  const totalMessages = statistics?.total || 0;
  const sentMessages = statistics?.sent || 0;
  const failedMessages = statistics?.failed || 0;
  const successRate = totalMessages > 0 ? ((sentMessages / totalMessages) * 100).toFixed(1) : "0.0";
  
  // Vendor saat ini hanya untuk Email (SMTP). WhatsApp memakai Baileys tanpa vendor.
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
          onClick={() => { refetch(); fetchCluster(); }}
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
          label="Email SMTP Vendors"
          value={loading ? "..." : emailVendors}
          subtitle={loading ? "..." : "WhatsApp via Baileys (tanpa vendor)"}
        />
        <MetricCard
          icon={<Clock size={16} />}
          label="Avg Latency"
          value={cluster ? `${cluster.gateway.latency_ms}ms` : "—"}
          subtitle="Gateway node"
        />
        <MetricCard
          icon={<HardDrive size={16} />}
          label="Queue Memory"
          value={cluster ? `${cluster.queue_memory_mb ?? 0}MB` : "—"}
          subtitle="Proses gateway (RSS)"
        />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Cluster Health Map
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ClusterHealthCard
            name="Main Gateway"
            status={cluster ? "healthy" : "down"}
            latency={cluster ? `${cluster.gateway.latency_ms}ms` : undefined}
            uptime={cluster?.gateway.uptime}
            detail={`Port 3001 · ${cluster ? "Online" : "Checking..."}`}
          />
          <ClusterHealthCard
            name="Redis Worker Pool"
            status={cluster?.redis.status || "down"}
            latency={cluster?.redis.latency_ms != null ? `${cluster.redis.latency_ms}ms` : undefined}
            detail="BullMQ queue backend"
          />
          {Object.entries(SERVICE_LABELS).map(([key, label]) => (
            <ClusterHealthCard
              key={key}
              name={label}
              status={cluster?.services?.[key]?.status || "down"}
              latency={cluster?.services?.[key]?.latency_ms != null ? `${cluster.services[key].latency_ms}ms` : undefined}
              detail={cluster?.services?.[key]?.status === "healthy" ? "Online" : "Tidak merespons"}
            />
          ))}
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
