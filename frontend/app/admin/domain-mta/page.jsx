"use client";

import { useState, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, Globe, RefreshCw, ShieldCheck, Plus, Trash2 } from "lucide-react";
import MetricCard from "@/components/shared/MetricCard";
import { useAdminData } from "@/hooks/useAdminData";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { useToast } from "@/lib/toast-context";

/** Domain MTA Page — Verifikasi DNS live & alokasi IP pool dari database. */

function StatusIcon({ status }) {
  if (status === "verified") return <CheckCircle size={14} className="text-emerald-500" />;
  if (status === "warning") return <AlertTriangle size={14} className="text-amber-500" />;
  return <XCircle size={14} className="text-red-500" />;
}

export default function DomainMtaPage() {
  const toast = useToast();
  const { statistics, loading: statsLoading } = useAdminData({ scope: ["statistics"] });
  const [domain, setDomain] = useState(null);
  const [ipPools, setIpPools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [showIpForm, setShowIpForm] = useState(false);
  const [ipForm, setIpForm] = useState({ ip_address: "", type: "Shared", status: "warming" });
  const [savingIp, setSavingIp] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [domainRes, ipRes] = await Promise.allSettled([
      apiGet("/v1/admin/mta/domains"),
      apiGet("/v1/admin/mta/ip-pools"),
    ]);
    if (domainRes.status === "fulfilled") {
      const domains = domainRes.value?.data || [];
      setDomain(domains.find((d) => d.is_primary) || domains[0] || null);
    }
    if (ipRes.status === "fulfilled") setIpPools(ipRes.value?.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await fetchData(); })();
    return () => { cancelled = true; };
  }, [fetchData]);

  const handleVerify = async () => {
    if (!domain) return;
    setVerifying(true);
    try {
      const res = await apiPost(`/v1/admin/mta/domains/${domain.id}/verify`);
      if (res?.data) setDomain(res.data);
    } catch {
      // DNS unreachable — state tetap menampilkan hasil cek terakhir
    } finally {
      setVerifying(false);
    }
  };

  const handleAddIp = async (e) => {
    e.preventDefault();
    if (!ipForm.ip_address.trim()) return;
    setSavingIp(true);
    try {
      const res = await apiPost("/v1/admin/mta/ip-pools", {
        ip_address: ipForm.ip_address.trim(),
        type: ipForm.type,
        status: ipForm.status,
      });
      if (res?.data) setIpPools((prev) => [...prev, res.data]);
      setIpForm({ ip_address: "", type: "Shared", status: "warming" });
      setShowIpForm(false);
      toast.success("IP Pool berhasil ditambahkan.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingIp(false);
    }
  };

  const handleRemoveIp = async (ip) => {
    try {
      await apiDelete(`/v1/admin/mta/ip-pools/${ip.id}`);
      setIpPools((prev) => prev.filter((item) => item.id !== ip.id));
      toast.success(`IP ${ip.ip_address} dihapus.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const totalEmails = statistics?.email || 0;
  const sentEmails = statistics?.sent || 0;
  const failedEmails = statistics?.failed || 0;
  const bounceRate = totalEmails > 0 ? ((failedEmails / totalEmails) * 100).toFixed(1) : "0.0";
  const dnsRecords = Array.isArray(domain?.dns_records) ? domain.dns_records : [];
  const allVerified = dnsRecords.length > 0 && dnsRecords.every((r) => r.status === "verified");

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
          onClick={() => fetchData()}
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
            <p className="text-sm font-semibold text-[var(--text-primary)]">{domain?.domain || "Belum ada domain"}</p>
            <p className="text-xs text-[var(--text-muted)]">Primary sending domain</p>
          </div>
          {domain && (
            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${
              allVerified
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
            }`}>
              <CheckCircle size={12} />
              {allVerified ? "Verified" : "Perlu verifikasi"}
            </span>
          )}
          <button
            onClick={handleVerify}
            disabled={verifying || !domain}
            className="ml-auto flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
          >
            <ShieldCheck size={14} className={verifying ? "animate-spin" : ""} />
            {verifying ? "Memeriksa DNS..." : "Verify DNS Sekarang"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="IP Reputation"
            value={loading ? "..." : `${domain?.reputation ?? 0}/100`}
            subtitle="Berdasarkan hasil verifikasi DNS"
          />
          <MetricCard
            label="Bounce Rate"
            value={statsLoading ? "..." : `${bounceRate}%`}
            subtitle="Last 30 days"
            trend={bounceRate === "0.0" ? "-0.2%" : `+${bounceRate}%`}
            trendDirection={bounceRate === "0.0" ? "up" : "down"}
          />
          <MetricCard
            label="Daily Volume"
            value={statsLoading ? "..." : totalEmails.toLocaleString("id-ID")}
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
              {dnsRecords.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">
                    Belum ada DNS record terdaftar. Tekan "Verify DNS Sekarang" untuk memeriksa.
                  </td>
                </tr>
              ) : dnsRecords.map((dns) => (
                <tr key={dns.type} className="border-b border-[var(--neutral-border)] last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-2.5">
                    <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-bold font-mono uppercase bg-zinc-100 dark:bg-zinc-800 text-[var(--text-primary)]">
                      {dns.type}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-secondary)] max-w-xs truncate">{dns.record || dns.expected || "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                      <StatusIcon status={dns.status} />
                      <span className="capitalize">{dns.status}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-[var(--text-muted)] font-mono">
                    {domain?.last_checked_at
                      ? new Date(domain.last_checked_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
                      : "Belum dicek"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* IP Pool */}
      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--neutral-border)] flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">IP Pool & Warm-up Status</h3>
          <button
            type="button"
            onClick={() => setShowIpForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Plus size={13} />
            Tambah IP
          </button>
        </div>

        {showIpForm && (
          <form onSubmit={handleAddIp} className="p-4 border-b border-[var(--neutral-border)] flex flex-wrap items-end gap-3 bg-zinc-50/50 dark:bg-zinc-900/30">
            <div className="flex-1 min-w-44">
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">IP Address</label>
              <input
                type="text"
                required
                placeholder="103.28.12.45"
                value={ipForm.ip_address}
                onChange={(e) => setIpForm((f) => ({ ...f, ip_address: e.target.value }))}
                className="w-full px-3 py-1.5 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Type</label>
              <select
                value={ipForm.type}
                onChange={(e) => setIpForm((f) => ({ ...f, type: e.target.value }))}
                className="px-3 py-1.5 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]"
              >
                <option value="Shared">Shared</option>
                <option value="Dedicated">Dedicated</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Status</label>
              <select
                value={ipForm.status}
                onChange={(e) => setIpForm((f) => ({ ...f, status: e.target.value }))}
                className="px-3 py-1.5 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]"
              >
                <option value="warming">Warming Up</option>
                <option value="warm">Warmed</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={savingIp}
              className="px-4 py-1.5 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {savingIp ? "Menyimpan..." : "Simpan"}
            </button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--neutral-border)]">
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">IP Address</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Reputation</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Daily Volume</th>
                <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]"></th>
              </tr>
            </thead>
            <tbody>
              {ipPools.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">
                    Belum ada IP pool terdaftar.
                  </td>
                </tr>
              ) : ipPools.map((ip) => (
                <tr key={ip.id || ip.ip_address} className="border-b border-[var(--neutral-border)] last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-2.5 font-mono text-sm text-[var(--text-primary)]">{ip.ip_address}</td>
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
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-secondary)]">{(ip.daily_volume || 0).toLocaleString("id-ID")}/day</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveIp(ip)}
                      className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--text-muted)] hover:text-red-600 transition-colors"
                      title="Hapus IP Pool"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
