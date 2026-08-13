import {
  Activity,
  Server,
  Clock,
  HardDrive,
  Wifi,
  Database,
  Mail,
  Zap,
} from "lucide-react";
import MetricCard from "@/components/admin/MetricCard";
import ClusterHealthCard from "@/components/admin/ClusterHealthCard";

/**
 * Admin Control Center — Ringkasan global infrastruktur.
 * DESIGN.md 6B.1: Ringkasan global traffic, active vendors, avg latency, queue memory.
 *                  Peta status cluster gateway.
 */
export default function ControlCenterPage() {
  return (
    <>
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          Control Center
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Ringkasan global infrastruktur dan kesehatan sistem.
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<Activity size={16} />}
          label="Total Traffic (24h)"
          value="142.830"
          trend="+8.2%"
          trendDirection="up"
          subtitle="Seluruh tenant"
        />
        <MetricCard
          icon={<Server size={16} />}
          label="Active Vendors"
          value="6"
          subtitle="3 WhatsApp · 2 Email · 1 SMS"
        />
        <MetricCard
          icon={<Clock size={16} />}
          label="Avg Latency"
          value="28ms"
          trend="-4ms"
          trendDirection="up"
          subtitle="Rata-rata cluster"
        />
        <MetricCard
          icon={<HardDrive size={16} />}
          label="Queue Memory"
          value="128MB"
          subtitle="Redis allocation"
          trend="42%"
          trendDirection="neutral"
        />
      </div>

      {/* Cluster Health Map */}
      <div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">
          Cluster Health Map
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ClusterHealthCard
            name="Main Gateway"
            status="healthy"
            latency="12ms"
            uptime="99.98%"
            detail="Port 3001 · 4 workers"
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

      {/* Recent Activity */}
      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">
          Aktivitas Terbaru
        </h3>
        <div className="space-y-3">
          {[
            { time: "2 menit lalu", event: "Vendor Meta WhatsApp Cloud API rate limit reached", type: "warning" },
            { time: "15 menit lalu", event: "DLQ auto-purge executed — 23 stale jobs removed", type: "info" },
            { time: "1 jam lalu", event: "New tenant onboarded: PT Maju Jaya (project: kasir-pos)", type: "success" },
            { time: "3 jam lalu", event: "Email vendor SendGrid failover activated", type: "warning" },
            { time: "6 jam lalu", event: "Database migration #47 applied successfully", type: "success" },
          ].map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 text-sm"
            >
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
          ))}
        </div>
      </div>
    </>
  );
}
