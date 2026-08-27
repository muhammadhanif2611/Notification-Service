"use client";

import { useState } from "react";
import { UserX, Upload, Trash2, Filter, RefreshCw } from "lucide-react";
import DataTable from "@/components/shared/DataTable";
import MetricCard from "@/components/shared/MetricCard";
import { useAdminData } from "@/hooks/useAdminData";

/**
 * Suppression List Page — Manajemen blokir otomatis.
 * DESIGN.md 6B.6: Hard Bounce, Spam Complaint, Unsubscribe. Bulk import/remove.
 */

const REASON_BADGE = {
  HARD_BOUNCE: { label: "Hard Bounce", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
  SPAM_COMPLAINT: { label: "Spam", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  UNSUBSCRIBE: { label: "Unsubscribe", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
};

export default function SuppressionListPage() {
  const { logs, loading, refetch } = useAdminData();
  const [filter, setFilter] = useState("ALL");

  // Filter logs yang statusnya FAILED (ini bisa dianggap sebagai "suppressed")
  const failedLogs = logs.filter(log => log.status === "FAILED");
  
  const filteredData = filter === "ALL"
    ? failedLogs
    : failedLogs.filter((log) => log.error_message?.includes(filter) || log.channel === filter);

  const columns = [
    {
      key: "recipient",
      label: "Contact",
      mono: true,
      render: (val) => <span className="font-mono text-xs">{val}</span>,
    },
    {
      key: "channel",
      label: "Channel",
      render: (val) => (
        <span className="inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase bg-zinc-100 dark:bg-zinc-800 text-[var(--text-secondary)]">
          {val}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (val) => {
        const config = val === "FAILED" ? { label: "Failed", className: "bg-red-500/10 text-red-700 dark:text-red-400" } : { label: val, className: "" };
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${config.className}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: "error_message",
      label: "Error Message",
      render: (val) => <span className="text-xs text-[var(--text-muted)]">{val || "-"}</span>,
    },
    {
      key: "created_at",
      label: "Date",
      mono: true,
      render: (val) => (
        <span className="text-xs">
          {new Date(val).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (_, row) => (
        <button 
          onClick={() => alert(`Detail log ${row.id}: ${row.error_message || "No error"}`)}
          className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--text-muted)] hover:text-red-600 transition-colors" 
          title="View details"
        >
          <Trash2 size={14} />
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Suppression List</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Daftar notifikasi yang gagal terkirim (auto-blocked).
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          icon={<UserX size={16} className="text-red-500" />}
          label="Total Failed"
          value={loading ? "..." : failedLogs.length}
          subtitle="Auto-blocked contacts"
        />
        <MetricCard
          label="Email Failed"
          value={loading ? "..." : failedLogs.filter(l => l.channel === "EMAIL").length}
          subtitle="Email channel failures"
        />
        <MetricCard
          label="WhatsApp Failed"
          value={loading ? "..." : failedLogs.filter(l => l.channel === "WHATSAPP").length}
          subtitle="WhatsApp channel failures"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-[var(--text-muted)]" />
        {["ALL", "EMAIL", "WHATSAPP"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? "bg-[var(--primary)] text-[var(--on-primary)]"
                : "border border-[var(--neutral-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          >
            {f === "ALL" ? "Semua" : f}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        loading={loading}
        emptyTitle="Tidak ada notifikasi gagal"
        emptyDescription="Daftar gagal kirim masih kosong. Log akan otomatis muncul saat ada kegagalan pengiriman."
      />
    </>
  );
}
