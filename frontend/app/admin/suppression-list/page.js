"use client";

import { useState } from "react";
import { UserX, Upload, Trash2, Filter } from "lucide-react";
import DataTable from "@/components/admin/DataTable";
import EmptyState from "@/components/admin/EmptyState";
import MetricCard from "@/components/admin/MetricCard";

/**
 * Suppression List Page — Manajemen blokir otomatis.
 * DESIGN.md 6B.6: Hard Bounce, Spam Complaint, Unsubscribe. Bulk import/remove.
 */

const MOCK_SUPPRESSIONS = [
  { id: "1", contact: "08123456789", channel: "WHATSAPP", reason: "HARD_BOUNCE", source: "Auto-detected", created_at: "2026-08-12T10:30:00Z" },
  { id: "2", contact: "user@example.com", channel: "EMAIL", reason: "SPAM_COMPLAINT", source: "SendGrid Webhook", created_at: "2026-08-11T14:15:00Z" },
  { id: "3", contact: "08198765432", channel: "SMS", reason: "HARD_BOUNCE", source: "Telkomsel API", created_at: "2026-08-10T09:00:00Z" },
  { id: "4", contact: "test@blocked.com", channel: "EMAIL", reason: "UNSUBSCRIBE", source: "User Request", created_at: "2026-08-09T16:45:00Z" },
  { id: "5", contact: "spam@domain.com", channel: "EMAIL", reason: "SPAM_COMPLAINT", source: "Amazon SES", created_at: "2026-08-08T11:20:00Z" },
];

const REASON_BADGE = {
  HARD_BOUNCE: { label: "Hard Bounce", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
  SPAM_COMPLAINT: { label: "Spam", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  UNSUBSCRIBE: { label: "Unsubscribe", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
};

export default function SuppressionListPage() {
  const [filter, setFilter] = useState("ALL");

  const filteredData = filter === "ALL"
    ? MOCK_SUPPRESSIONS
    : MOCK_SUPPRESSIONS.filter((s) => s.reason === filter);

  const columns = [
    {
      key: "contact",
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
      key: "reason",
      label: "Reason",
      render: (val) => {
        const config = REASON_BADGE[val] || { label: val, className: "" };
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${config.className}`}>
            {config.label}
          </span>
        );
      },
    },
    { key: "source", label: "Source" },
    {
      key: "created_at",
      label: "Date Added",
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
      render: () => (
        <button className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--text-muted)] hover:text-red-600 transition-colors" title="Remove from list">
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
            Manajemen blokir otomatis untuk melindungi reputasi pengirim.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--neutral-border)] text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
          <Upload size={16} />
          Import CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          icon={<UserX size={16} className="text-red-500" />}
          label="Hard Bounces"
          value="2"
          subtitle="Auto-blocked contacts"
        />
        <MetricCard
          label="Spam Complaints"
          value="2"
          subtitle="Reported by providers"
        />
        <MetricCard
          label="Unsubscribes"
          value="1"
          subtitle="User opt-out requests"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-[var(--text-muted)]" />
        {["ALL", "HARD_BOUNCE", "SPAM_COMPLAINT", "UNSUBSCRIBE"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === f
                ? "bg-[var(--primary)] text-[var(--on-primary)]"
                : "border border-[var(--neutral-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-50 dark:hover:bg-zinc-800"
            }`}
          >
            {f === "ALL" ? "Semua" : REASON_BADGE[f]?.label || f}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={filteredData}
        emptyTitle="Tidak ada kontak tersuppresi"
        emptyDescription="Daftar supresi masih kosong. Kontak akan otomatis ditambahkan saat terjadi hard bounce, spam complaint, atau unsubscribe."
      />
    </>
  );
}
