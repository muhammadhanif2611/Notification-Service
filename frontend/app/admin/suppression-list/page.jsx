"use client";

import { useState, useEffect, useCallback } from "react";
import { UserX, Trash2, Filter, RefreshCw, Plus } from "lucide-react";
import DataTable from "@/components/shared/DataTable";
import MetricCard from "@/components/shared/MetricCard";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { useToast } from "@/lib/toast-context";

/** Suppression List Page — Daftar kontak terblokir (hard bounce, spam, unsubscribe) dari database. */

const REASON_BADGE = {
  HARD_BOUNCE: { label: "Hard Bounce", className: "bg-red-500/10 text-red-700 dark:text-red-400" },
  SPAM_COMPLAINT: { label: "Spam", className: "bg-amber-500/10 text-amber-700 dark:text-amber-400" },
  UNSUBSCRIBE: { label: "Unsubscribe", className: "bg-blue-500/10 text-blue-700 dark:text-blue-400" },
  MANUAL: { label: "Manual", className: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-400" },
};

export default function SuppressionListPage() {
  const toast = useToast();
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ contact: "", channel: "EMAIL", reason: "MANUAL" });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiGet("/v1/suppressions");
      setEntries(res?.data || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await fetchData(); })();
    return () => { cancelled = true; };
  }, [fetchData]);

  const handleRemove = async (row) => {
    try {
      await apiDelete(`/v1/suppressions/${row.id}`);
      setEntries((prev) => prev.filter((e) => e.id !== row.id));
      toast.success({ title: "Kontak dihapus", message: `${row.contact} dikeluarkan dari suppression list.` });
    } catch (err) {
      toast.error({ title: "Gagal menghapus", message: err.message });
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.contact) return;
    setSaving(true);
    try {
      await apiPost("/v1/suppressions", form);
      toast.success({ title: "Kontak ditambahkan", message: `${form.contact} masuk suppression list.` });
      setShowForm(false);
      setForm({ contact: "", channel: "EMAIL", reason: "MANUAL" });
      await fetchData();
    } catch (err) {
      toast.error({ title: "Gagal menambahkan", message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const filteredData = filter === "ALL" ? entries : entries.filter((e) => e.channel === filter);

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
        const config = REASON_BADGE[val] || REASON_BADGE.MANUAL;
        return (
          <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold ${config.className}`}>
            {config.label}
          </span>
        );
      },
    },
    {
      key: "notes",
      label: "Notes",
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
          onClick={() => handleRemove(row)}
          className="p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--text-muted)] hover:text-red-600 transition-colors"
          title="Hapus dari suppression list"
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
            Kontak yang diblokir dari pengiriman (bounce, spam, unsubscribe).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Plus size={14} />
            Tambah Kontak
          </button>
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Form tambah manual */}
      {showForm && (
        <form onSubmit={handleAdd} className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-48">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Email / Nomor</label>
            <input
              type="text"
              value={form.contact}
              onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
              placeholder="user@example.com / 62812xxxx"
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Channel</label>
            <select
              value={form.channel}
              onChange={(e) => setForm((f) => ({ ...f, channel: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]"
            >
              <option value="EMAIL">EMAIL</option>
              <option value="WHATSAPP">WHATSAPP</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Reason</label>
            <select
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              className="px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]"
            >
              <option value="MANUAL">Manual</option>
              <option value="HARD_BOUNCE">Hard Bounce</option>
              <option value="SPAM_COMPLAINT">Spam Complaint</option>
              <option value="UNSUBSCRIBE">Unsubscribe</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </form>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          icon={<UserX size={16} className="text-red-500" />}
          label="Total Suppressed"
          value={loading ? "..." : entries.length}
          subtitle="Kontak terblokir"
        />
        <MetricCard
          label="Email"
          value={loading ? "..." : entries.filter((e) => e.channel === "EMAIL").length}
          subtitle="Email channel"
        />
        <MetricCard
          label="WhatsApp"
          value={loading ? "..." : entries.filter((e) => e.channel === "WHATSAPP").length}
          subtitle="WhatsApp channel"
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
        emptyTitle="Suppression list kosong"
        emptyDescription="Kontak akan otomatis masuk ke sini saat terjadi hard bounce, atau tambahkan manual lewat tombol di atas."
      />
    </>
  );
}
