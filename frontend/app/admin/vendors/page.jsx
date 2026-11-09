"use client";

import { useState, useMemo } from "react";
import { Plus, Wifi, WifiOff, Copy, RefreshCw, Lock, Pencil, Trash2 } from "lucide-react";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import { useAdminData } from "@/hooks/useAdminData";
import { useToast } from "@/lib/toast-context";
import { apiPost, apiPut, apiDelete } from "@/lib/api";

const CHANNEL_BADGE = {
  WHATSAPP: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  EMAIL: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
};

// Halaman Vendors & Kredensial Admin untuk mengelola provider SMTP Email beserta enkripsi AES-256-GCM.
export default function VendorsPage() {
  const toast = useToast();
  const scopeConfig = useMemo(() => ({ scope: ["vendors"] }), []);
  const { vendors, loading, refetch } = useAdminData(scopeConfig);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    channel: "EMAIL",
    priority: 1,
    credentials: "{}",
  });

  const [editVendor, setEditVendor] = useState(null);
  const [editData, setEditData] = useState({ name: "", priority: 1, is_active: true, credentials: "" });
  const [updating, setUpdating] = useState(false);

  const [deleteVendor, setDeleteVendor] = useState(null);
  const [deleting, setDeleting] = useState(false);

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
      toast.error("Gagal menambahkan vendor: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openEditModal = (vendor) => {
    setEditVendor(vendor);
    setEditData({
      name: vendor.name,
      priority: vendor.priority,
      is_active: vendor.is_active ?? true,
      credentials: "",
    });
  };

  const closeEditModal = () => {
    setEditVendor(null);
    setEditData({ name: "", priority: 1, is_active: true, credentials: "" });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    const payload = {
      name: editData.name,
      priority: parseInt(editData.priority),
      is_active: editData.is_active,
    };

    if (editData.credentials.trim()) {
      try {
        payload.credentials = JSON.parse(editData.credentials);
      } catch {
        toast.error("Format JSON kredensial tidak valid.");
        return;
      }
    }

    setUpdating(true);
    try {
      await apiPut(`/v1/clients/vendors/${editVendor.id}`, payload);
      await refetch();
      closeEditModal();
    } catch (err) {
      toast.error("Gagal memperbarui vendor: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiDelete(`/v1/clients/vendors/${deleteVendor.id}`);
      await refetch();
      setDeleteVendor(null);
    } catch (err) {
      toast.error("Gagal menghapus vendor: " + err.message);
    } finally {
      setDeleting(false);
    }
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
      key: "credential",
      label: "Kredensial",
      render: () => (
        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold">
          <Lock size={11} />
          AES-256-GCM Encrypted
        </span>
      ),
    },
    {
      key: "actions",
      label: "Aksi",
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => openEditModal(row)}
            className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors"
            title="Update kredensial vendor"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => copyToClipboard(JSON.stringify(row, null, 2), row.id)}
            className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Copy vendor metadata JSON"
          >
            {copiedId === row.id ? <RefreshCw size={14} className="animate-spin" /> : <Copy size={14} />}
          </button>
          <button
            onClick={() => setDeleteVendor(row)}
            className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--text-muted)] hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Hapus vendor"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Vendors &amp; Kredensial</h2>
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

      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20">
        <Lock size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Kredensial terenkripsi</p>
          <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5">
            Semua secret key disimpan dengan enkripsi AES-256-GCM. Key dekripsi hanya tersedia di environment variable server.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={vendors}
        loading={loading}
        emptyTitle="Belum ada vendor terdaftar"
        emptyDescription="Tambahkan vendor provider untuk mulai mengirim notifikasi."
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Tambah Vendor Baru">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Nama Vendor</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Gmail SMTP / Mailtrap"
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

      <Modal isOpen={!!editVendor} onClose={closeEditModal} title={`Edit Vendor — ${editVendor?.name ?? ""}`}>
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Nama Vendor</label>
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Priority (1-10)</label>
              <input
                type="number"
                value={editData.priority}
                onChange={(e) => setEditData({ ...editData, priority: e.target.value })}
                min="1"
                max="10"
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Status Vendor</label>
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={editData.is_active}
                  onChange={(e) => setEditData({ ...editData, is_active: e.target.checked })}
                  className="rounded border-[var(--neutral-border)]"
                />
                <span>{editData.is_active ? "Active" : "Inactive"}</span>
              </label>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Kredensial Baru (JSON — Opsional)</label>
            <textarea
              value={editData.credentials}
              onChange={(e) => setEditData({ ...editData, credentials: e.target.value })}
              rows={4}
              placeholder='Kosongkan jika tidak ingin mengubah kredensial SMTP. Contoh: {"host": "smtp.gmail.com", "port": 587, "secure": false, "user": "...", "pass": "...", "from": "..."}'
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">
              Biarkan kosong jika hanya mengubah nama, prioritas, atau status. Isi JSON baru untuk mengganti dan mengenkripsi ulang kredensial SMTP dengan AES-256-GCM.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--neutral-border)]">
            <button
              type="button"
              onClick={closeEditModal}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--neutral-border)] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={updating}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
            >
              {updating ? "Memperbarui..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleteVendor} onClose={() => setDeleteVendor(null)} title="Hapus Vendor">
        <div className="space-y-4">
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20">
            <Trash2 size={16} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">Hapus vendor &ldquo;{deleteVendor?.name}&rdquo;?</p>
              <p className="text-xs text-red-700 dark:text-red-400/80 mt-0.5">
                Tindakan ini permanen dan tidak dapat dibatalkan. Kredensial terenkripsi vendor akan ikut terhapus.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--neutral-border)]">
            <button
              type="button"
              onClick={() => setDeleteVendor(null)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--neutral-border)] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleting ? "Menghapus..." : "Hapus Vendor"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
