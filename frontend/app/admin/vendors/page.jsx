"use client";

import { useState, useEffect } from "react";
import { Plus, Wifi, WifiOff, Copy, RefreshCw } from "lucide-react";
import DataTable from "@/components/admin/DataTable";
import Modal from "@/components/admin/Modal";
import { useAdminData } from "@/hooks/useAdminData";
import { apiPost } from "@/lib/api";

/**
 * Vendors Page — Manajemen integrasi vendor provider.
 * DESIGN.md 6B.2: WhatsApp, Email, SMS providers. Rate limit TPS, fallback routing, API key management.
 */

const CHANNEL_BADGE = {
  WHATSAPP: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  EMAIL: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  SMS: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
};

export default function VendorsPage() {
  const { vendors, loading, refetch } = useAdminData();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    channel: "EMAIL",
    priority: 1,
    credentials: "{}",
  });

  useEffect(() => {
    const interval = setInterval(() => refetch(), 30000);
    return () => clearInterval(interval);
  }, [refetch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost("/v1/clients/vendors", {
        provider: "NODEMAILER",
        name: formData.name,
        channel: "EMAIL",
        priority: parseInt(formData.priority),
        credentials: JSON.parse(formData.credentials),
      });
      await refetch();
      setShowModal(false);
      setFormData({ name: "", channel: "EMAIL", priority: 1, credentials: "{}" });
    } catch (err) {
      alert("Gagal menambahkan vendor: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const columns = [
    {
      key: "name",
      label: "Vendor Name",
      render: (val) => <span className="font-medium">{val}</span>,
    },
    {
      key: "channel",
      label: "Channel",
      render: (val) => (
        <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase ${CHANNEL_BADGE[val] || ""}`}>
          {val}
        </span>
      ),
    },
    {
      key: "priority",
      label: "Priority",
      mono: true,
      render: (val) => (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-mono font-semibold">
          {val}
        </span>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (val) => (
        <span className="inline-flex items-center gap-1.5">
          {val ? (
            <>
              <Wifi size={12} className="text-emerald-500" />
              <span className="text-xs text-emerald-700 dark:text-emerald-400">Active</span>
            </>
          ) : (
            <>
              <WifiOff size={12} className="text-zinc-400" />
              <span className="text-xs text-[var(--text-muted)]">Inactive</span>
            </>
          )}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (_, row) => (
        <button
          onClick={() => copyToClipboard(JSON.stringify(row, null, 2), row.id)}
          className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          title="Copy vendor JSON"
        >
          {copiedId === row.id ? <RefreshCw size={14} className="animate-spin" /> : <Copy size={14} />}
        </button>
      ),
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Vendor Providers</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manajemen kredensial SMTP untuk pengiriman Email. WhatsApp memakai Baileys dan tidak butuh vendor.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
        >
          <Plus size={16} />
          Tambah Vendor
        </button>
      </div>

      <DataTable
        columns={columns}
        data={vendors}
        loading={loading}
        emptyTitle="Belum ada vendor terdaftar"
        emptyDescription="Tambahkan vendor provider untuk mulai mengirim notifikasi."
      />

      {/* Add Vendor Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Tambah Vendor Baru">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Nama Vendor</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Baileys WhatsApp / Gmail SMTP"
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Channel</label>
              <div className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-zinc-100 dark:bg-zinc-800 text-sm text-[var(--text-secondary)]">
                Email (Nodemailer SMTP)
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Priority (1-10)</label>
              <input
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                min="1"
                max="10"
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Credentials (JSON)</label>
            <textarea
              value={formData.credentials}
              onChange={(e) => setFormData({ ...formData, credentials: e.target.value })}
              rows={4}
              placeholder='{"host": "smtp.gmail.com", "port": 587, "secure": false, "user": "you@gmail.com", "pass": "app-password", "from": "..."}'
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Masukkan credentials dalam format JSON. Contoh: {"{\"apiKey\": \"sk_live_123\", \"endpoint\": \"https://api.vendor.com\"}"}
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--neutral-border)]">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--neutral-border)] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
