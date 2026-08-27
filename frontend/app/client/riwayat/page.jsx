"use client";

import { useState, useEffect, useCallback } from "react";
import { X, RefreshCw } from "lucide-react";
import DataTable from "@/components/shared/DataTable";
import StatusBadge from "@/components/shared/StatusBadge";
import { useProjectContext } from "@/lib/project-context";
import { apiGet } from "@/lib/api";

const CHANNELS = ["ALL", "WHATSAPP", "EMAIL", "SMS"];
const STATUSES = ["ALL", "DELIVERED", "QUEUED", "FAILED"];

/** RiwayatPage â€” Log transaksi pesan dengan filter + drawer detail (DESIGN.md 6A.6). */
export default function RiwayatPage() {
  const { activeProject } = useProjectContext();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [selected, setSelected] = useState(null);

  const fetchLogs = useCallback(async () => {
    if (!activeProject?.id) { setLogs([]); setLoading(false); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("projectId", activeProject.id);
      if (channel !== "ALL") params.set("channel", channel);
      if (status !== "ALL") params.set("status", status);
      params.set("limit", "50");
      const res = await apiGet(`/v1/logs?${params}`);
      const d = res?.data;
      setLogs(Array.isArray(d) ? d : d?.data || []);
    } catch { setLogs([]); } finally { setLoading(false); }
  }, [channel, status, activeProject?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchLogs();
    })();
    return () => { cancelled = true; };
  }, [fetchLogs]);

  const filterBtn = (active) =>
    `px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
      active ? "bg-[var(--primary)] text-[var(--on-primary)]"
        : "border border-[var(--neutral-border)] text-[var(--text-secondary)] hover:bg-zinc-50 dark:hover:bg-zinc-800/50"}`;

  const columns = [
    { key: "message_id", label: "Message ID", mono: true, render: (v) => <span className="text-xs">{(v || "â€”").slice(0, 18)}</span> },
    { key: "channel", label: "Channel", render: (v) => <span className="text-xs font-mono">{v || "â€”"}</span> },
    { key: "recipient", label: "Penerima", render: (v) => <span className="text-xs">{v || "â€”"}</span> },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
    { key: "retry_count", label: "Retry", mono: true, render: (v) => <span className="text-xs">{v ?? 0}</span> },
    {
      key: "created_at", label: "Waktu", mono: true,
      render: (v) => <span className="text-xs">{v ? new Date(v).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "â€”"}</span>,
    },
  ];

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Riwayat Pesan</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">Log transaksi pengiriman notifikasi.</p>
        </div>
        <button onClick={fetchLogs} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--text-muted)] mr-1">Channel:</span>
          {CHANNELS.map((c) => (
            <button key={c} onClick={() => setChannel(c)} className={filterBtn(channel === c)}>{c}</button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-[var(--text-muted)] mr-1">Status:</span>
          {STATUSES.map((s) => (
            <button key={s} onClick={() => setStatus(s)} className={filterBtn(status === s)}>{s}</button>
          ))}
        </div>
      </div>

      {/* Info Project Aktif */}
      {activeProject && (
        <div className="text-xs text-[var(--text-muted)]">
          Menampilkan log untuk project: <span className="font-medium text-[var(--text-primary)]">{activeProject.name}</span>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-12 text-center text-sm text-[var(--text-muted)]">Memuat data...</div>
      ) : (
        <DataTable
          columns={columns}
          data={logs}
          onRowClick={setSelected}
          emptyTitle="Belum ada log"
          emptyDescription="Log pengiriman akan muncul setelah ada notifikasi terkirim."
        />
      )}

      {/* Detail Drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md h-full bg-[var(--neutral-surface)] border-l border-[var(--neutral-border)] shadow-xl overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--neutral-border)]">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Detail Pesan</h3>
              <button onClick={() => setSelected(null)} className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" aria-label="Tutup">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[var(--text-muted)]">Status</span>
                <StatusBadge status={selected.status} />
              </div>
              {[
                ["Message ID", selected.message_id],
                ["Channel", selected.channel],
                ["Penerima", selected.recipient],
                ["Template", selected.template_id],
                ["Retry Count", selected.retry_count ?? 0],
                ["Dibuat", selected.created_at ? new Date(selected.created_at).toLocaleString("id-ID") : "â€”"],
                ["Diupdate", selected.updated_at ? new Date(selected.updated_at).toLocaleString("id-ID") : "â€”"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <span className="text-xs text-[var(--text-muted)] shrink-0">{label}</span>
                  <span className="text-xs font-mono text-[var(--text-primary)] text-right break-all">{value || "â€”"}</span>
                </div>
              ))}
              {selected.payload && (
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-2">Raw Payload</p>
                  <pre className="text-[11px] font-mono bg-zinc-950 text-emerald-400 rounded-lg p-3 overflow-x-auto">
                    {JSON.stringify(selected.payload, null, 2)}
                  </pre>
                </div>
              )}
              {selected.error_message && (
                <div className="px-3 py-2.5 rounded-lg bg-[var(--status-failed-bg)] text-[var(--status-failed-text)] text-xs">
                  {selected.error_message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
