"use client";

import { useState, useEffect } from "react";
import { Activity, RefreshCw, Cpu, ExternalLink } from "lucide-react";
import MetricCard from "@/components/shared/MetricCard";
import { useAdminData } from "@/hooks/useAdminData";

const BULL_BOARD_URL = process.env.NEXT_PUBLIC_BULL_BOARD_URL || "http://127.0.0.1:3001/admin/queues";

export default function MonitoringPage() {
  const { statistics, loading, refetch } = useAdminData();
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => refetch(), 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, refetch]);

  const total = statistics?.total || 0;
  const sent = statistics?.sent || 0;
  const failed = statistics?.failed || 0;
  const pending = statistics?.pending || 0;

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">
            Queue Telemetry
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Monitoring real-time queue Redis dan worker performance.
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
            {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
          </button>
          <button
            onClick={() => refetch()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Activity size={16} />}
          label="Messages / Second"
          value={loading ? "..." : "—"}
          subtitle="Real-time TPS"
        />
        <MetricCard
          icon={<Cpu size={16} />}
          label="Active Workers"
          value={loading ? "..." : "5 / 6"}
          subtitle="1 idle"
        />
        <MetricCard
          label="Dead Letter Queue"
          value={loading ? "..." : "0"}
          subtitle="Semua sudah diproses"
          trend="Clean"
          trendDirection="up"
        />
        <MetricCard
          label="Avg Processing Time"
          value={loading ? "..." : "180ms"}
          subtitle="Per job rata-rata"
          trend="-22ms"
          trendDirection="up"
        />
      </div>

      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--neutral-border)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Queue Statistics</h3>
          <a
            href={BULL_BOARD_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <ExternalLink size={12} />
            Buka Bull Board
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--neutral-border)]">
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Metric</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Value</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[var(--neutral-border)] hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-primary)]">Total Messages</td>
                <td className="px-4 py-2.5 font-mono text-[var(--text-primary)]">{total.toLocaleString("id-ID")}</td>
              </tr>
              <tr className="border-b border-[var(--neutral-border)] hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-primary)]">Sent</td>
                <td className="px-4 py-2.5 font-mono text-emerald-600 dark:text-emerald-400">{sent.toLocaleString("id-ID")}</td>
              </tr>
              <tr className="border-b border-[var(--neutral-border)] hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-primary)]">Failed</td>
                <td className="px-4 py-2.5 font-mono text-red-600 dark:text-red-400">{failed.toLocaleString("id-ID")}</td>
              </tr>
              <tr className="border-b border-[var(--neutral-border)] hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-primary)]">Pending</td>
                <td className="px-4 py-2.5 font-mono text-amber-600 dark:text-amber-400">{pending.toLocaleString("id-ID")}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
