"use client";

import { Mail, CheckCircle, XCircle, AlertTriangle, Globe, RefreshCw } from "lucide-react";
import MetricCard from "@/components/admin/MetricCard";
import { useAdminData } from "@/hooks/useAdminData";

/**
 * Domain MTA Page — Outbound Email Routing management.
 * DESIGN.md 6B.4: Domain pengirim, DNS Record verification (SPF, DKIM, DMARC), IP reputation, Warm IP.
 */

const DNS_RECORDS = [
  { type: "SPF", record: "v=spf1 include:_spf.gateway.com ~all", status: "verified", lastChecked: "2 jam lalu" },
  { type: "DKIM", record: "2048-bit RSA key — selector: gw2026._domainkey", status: "verified", lastChecked: "2 jam lalu" },
  { type: "DMARC", record: "v=DMARC1; p=quarantine; rua=mailto:dmarc@gateway.com", status: "verified", lastChecked: "2 jam lalu" },
  { type: "MX", record: "10 mail.gateway.com", status: "verified", lastChecked: "2 jam lalu" },
  { type: "rDNS / PTR", record: "103.28.12.45 → mail.gateway.com", status: "warning", lastChecked: "6 jam lalu" },
];

const IP_POOL = [
  { ip: "103.28.12.45", type: "Dedicated", status: "warm", reputation: 92, volume: "12,400/day" },
  { ip: "103.28.12.46", type: "Dedicated", status: "warming", reputation: 78, volume: "2,100/day" },
  { ip: "103.28.12.47", type: "Shared", status: "warm", reputation: 88, volume: "8,900/day" },
];

function StatusIcon({ status }) {
  if (status === "verified") return <CheckCircle size={14} className="text-emerald-500" />;
  if (status === "warning") return <AlertTriangle size={14} className="text-amber-500" />;
  return <XCircle size={14} className="text-red-500" />;
}

export default function DomainMtaPage() {
  const { statistics, loading, refetch } = useAdminData();

  const totalEmails = statistics?.email || 0;
  const sentEmails = statistics?.sent || 0;
  const failedEmails = statistics?.failed || 0;
  const bounceRate = totalEmails > 0 ? ((failedEmails / totalEmails) * 100).toFixed(1) : "0.0";

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Domain & MTA</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Pengaturan domain pengirim email, verifikasi DNS, dan alokasi IP.
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

      {/* Domain Info */}
      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10">
            <Globe size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">mail.gateway.com</p>
            <p className="text-xs text-[var(--text-muted)]">Primary sending domain</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
            <CheckCircle size={12} />
            Verified
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard 
            label="IP Reputation" 
            value={loading ? "..." : "92/100"} 
            subtitle="Sender Score" 
            trend="+2" 
            trendDirection="up" 
          />
          <MetricCard 
            label="Bounce Rate" 
            value={loading ? "..." : `${bounceRate}%`} 
            subtitle="Last 30 days" 
            trend={bounceRate === "0.0" ? "-0.2%" : `+${bounceRate}%`}
            trendDirection={bounceRate === "0.0" ? "up" : "down"} 
          />
          <MetricCard 
            label="Daily Volume" 
            value={loading ? "..." : totalEmails.toLocaleString("id-ID")} 
            subtitle={`${sentEmails.toLocaleString("id-ID")} sent · ${failedEmails.toLocaleString("id-ID")} failed`} 
            trend="+5.1%" 
            trendDirection="up" 
          />
        </div>
      </div>

      {/* DNS Records */}
      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--neutral-border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">DNS Records Verification</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--neutral-border)]">
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Record</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Last Checked</th>
              </tr>
            </thead>
            <tbody>
              {DNS_RECORDS.map((dns) => (
                <tr key={dns.type} className="border-b border-[var(--neutral-border)] last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold font-mono uppercase bg-zinc-100 dark:bg-zinc-800 text-[var(--text-primary)]">
                      {dns.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-secondary)] max-w-xs truncate">{dns.record}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <StatusIcon status={dns.status} />
                      <span className="capitalize">{dns.status}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--text-muted)] font-mono">{dns.lastChecked}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* IP Pool */}
      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--neutral-border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">IP Pool & Warm-up Status</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--neutral-border)]">
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">IP Address</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Reputation</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Daily Volume</th>
              </tr>
            </thead>
            <tbody>
              {IP_POOL.map((ip) => (
                <tr key={ip.ip} className="border-b border-[var(--neutral-border)] last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-sm text-[var(--text-primary)]">{ip.ip}</td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)]">{ip.type}</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${ip.status === "warm" ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${ip.status === "warm" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"}`} />
                      {ip.status === "warm" ? "Warmed" : "Warming Up"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 max-w-[60px]">
                        <div
                          className={`h-full rounded-full ${ip.reputation >= 90 ? "bg-emerald-500" : ip.reputation >= 80 ? "bg-amber-500" : "bg-red-500"}`}
                          style={{ width: `${ip.reputation}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-[var(--text-primary)]">{ip.reputation}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-secondary)]">{ip.volume}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
