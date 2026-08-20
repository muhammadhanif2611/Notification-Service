"use client";

import { useState } from "react";
import { useApiKeys } from "@/hooks/useApiKeys";
import { useProjectContext } from "@/lib/project-context";
import Modal from "@/components/admin/Modal";
import Alert from "@/components/shared/Alert";
import {
  Key, Plus, Copy, Check, Search, AlertTriangle, Shield, Clock,
  Filter, X, Trash2, Lock, Pencil,
} from "lucide-react";

export default function ApiKeysPage() {
  const { activeProject } = useProjectContext();
  const projectId = activeProject?.id || "";
  const { keys, loading, error, createKey, deactivateKey, updateKey, deleteKey } = useApiKeys(projectId);

  const [searchTerm, setSearchTerm] = useState("");
  const [modeFilter, setModeFilter] = useState("ALL");

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [modeInput, setModeInput] = useState("production");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [editingKey, setEditingKey] = useState(null);
  const [editName, setEditName] = useState("");
  const [keyToDelete, setKeyToDelete] = useState(null);

  const [createdSecretKey, setCreatedSecretKey] = useState(null);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [keyToDeactivate, setKeyToDeactivate] = useState(null);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!labelInput.trim() || !projectId) return;
    setIsSubmitting(true);
    try {
      const result = await createKey(projectId, labelInput.trim(), modeInput);
      setIsCreateModalOpen(false);
      setLabelInput("");
      setModeInput("production");
      if (result && result.rawApiKey) setCreatedSecretKey(result.rawApiKey);
    } catch (err) {
      console.error("Gagal membuat API Key:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopySecret = () => {
    if (!createdSecretKey) return;
    navigator.clipboard.writeText(createdSecretKey);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleConfirmDeactivate = async () => {
    if (!keyToDeactivate) return;
    try { await deactivateKey(keyToDeactivate.id); setKeyToDeactivate(null); }
    catch (err) { console.error("Gagal menonaktifkan API Key:", err); }
  };

  const openEdit = (key) => { setEditingKey(key); setEditName(key.name); };

  const handleConfirmEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    try { await updateKey(editingKey.id, editName.trim()); setEditingKey(null); }
    catch (err) { console.error("Gagal mengedit API Key:", err); }
  };

  const handleConfirmDelete = async () => {
    if (!keyToDelete) return;
    try { await deleteKey(keyToDelete.id); setKeyToDelete(null); }
    catch (err) { console.error("Gagal menghapus API Key:", err); }
  };

  const filteredKeys = keys.filter((key) => {
    const matchesSearch =
      (key.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (key.key_preview || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMode = modeFilter === "ALL" || (key.environment || "").toUpperCase() === modeFilter;
    return matchesSearch && matchesMode;
  });
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[var(--neutral-border)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Kelola API Key</h1>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-[var(--client-badge-bg)] text-[var(--client-badge-text)]">
              {activeProject?.name || "Tanpa Project"}
            </span>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Gunakan API Key untuk autentikasi request dari aplikasi Anda ke Notification Gateway.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] font-medium text-sm rounded-lg transition-colors shadow-xs focus:outline-none"
        >
          <Plus className="w-4 h-4" />
          Buat API Key Baru
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <Alert variant="error" title="Terjadi kesalahan" onClose={() => {}}>
          {error}
        </Alert>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--neutral-surface)] p-3 rounded-xl border border-[var(--neutral-border)] shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Cari label atau key..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--neutral-bg)] border border-[var(--neutral-border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-[var(--text-muted)]" />
          <span className="text-xs font-medium text-[var(--text-secondary)]">Mode:</span>
          <div className="inline-flex p-1 bg-[var(--neutral-bg)] rounded-lg text-xs font-medium border border-[var(--neutral-border)]">
            {["ALL", "PRODUCTION", "SANDBOX"].map((m) => (
              <button
                key={m}
                onClick={() => setModeFilter(m)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  modeFilter === m
                    ? "bg-[var(--neutral-surface)] text-[var(--text-primary)] shadow-xs font-semibold"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {m === "ALL" ? "Semua" : m}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Tabel API Key */}
      <div className="bg-[var(--neutral-surface)] rounded-xl border border-[var(--neutral-border)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--neutral-bg)] text-[var(--text-secondary)] border-b border-[var(--neutral-border)] text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Label</th>
                <th className="px-6 py-3.5">API Key</th>
                <th className="px-6 py-3.5">Mode</th>
                <th className="px-6 py-3.5">Dibuat</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--neutral-border)]">
              {loading && keys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                      <span>Memuat daftar API Key...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-[var(--neutral-bg)] border border-[var(--neutral-border)] flex items-center justify-center text-[var(--text-muted)] mb-3">
                        <Key className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-[var(--text-primary)]">Tidak Ada API Key</h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">
                        {searchTerm || modeFilter !== "ALL"
                          ? "Tidak ada API Key yang cocok dengan filter pencarian."
                          : "Buat API Key pertama Anda untuk mulai mengirim notifikasi."}
                      </p>
                      {!searchTerm && modeFilter === "ALL" && (
                        <button onClick={() => setIsCreateModalOpen(true)}
                          className="px-3.5 py-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] font-medium text-xs rounded-lg transition-colors">
                          Buat API Key Sekarang
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredKeys.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--neutral-bg)] transition-colors">
                    {/* Label */}
                    <td className="px-6 py-4 font-medium text-[var(--text-primary)]">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${item.is_active ? "bg-emerald-500" : "bg-[var(--text-muted)]"}`} />
                        <span>{item.name}</span>
                      </div>
                    </td>
                    {/* Masked Key */}
                    <td className="px-6 py-4 font-mono text-xs text-[var(--text-secondary)]">
                      {item.key_prefix}{item.key_preview}
                    </td>
                    {/* Mode */}
                    <td className="px-6 py-4">
                      {(item.environment || "").toUpperCase() === "SANDBOX" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-[var(--status-queued-bg)] text-[var(--status-queued-text)] border border-[var(--neutral-border)]">
                          <Shield className="w-3 h-3" />SANDBOX
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-[var(--status-delivered-bg)] text-[var(--status-delivered-text)] border border-[var(--neutral-border)]">
                          <Shield className="w-3 h-3" />PRODUCTION
                        </span>
                      )}
                    </td>
                    {/* Dibuat */}
                    <td className="px-6 py-4 text-xs text-[var(--text-secondary)]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                        {new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </div>
                    </td>
                    {/* Status */}
                    <td className="px-6 py-4">
                      {item.is_active ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--status-delivered-bg)] text-[var(--status-delivered-text)]">Aktif</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--neutral-bg)] text-[var(--text-secondary)] border border-[var(--neutral-border)]">Nonaktif</span>
                      )}
                    </td>
                    {/* Aksi */}
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(item)} title="Edit nama API Key"
                          className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--neutral-bg)] rounded-md transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {item.is_active && (
                          <button onClick={() => setKeyToDeactivate(item)} title="Nonaktifkan API Key"
                            className="p-1.5 text-amber-600 hover:text-amber-700 dark:text-amber-400 hover:bg-amber-500/10 rounded-md transition-colors">
                            <Lock className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button onClick={() => setKeyToDelete(item)} title="Hapus API Key permanen"
                          className="p-1.5 text-red-600 hover:text-red-700 dark:text-red-400 hover:bg-red-500/10 rounded-md transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Modal: Buat API Key */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Buat API Key Baru" maxWidth="max-w-md">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="p-3 rounded-lg bg-[var(--neutral-bg)] border border-[var(--neutral-border)]">
            <p className="text-[11px] font-medium text-[var(--text-muted)]">Project</p>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{activeProject?.name || "-"}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Nama / Label API Key</label>
            <input type="text" required placeholder="Misal: Backend Utama Production" value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--neutral-bg)] border border-[var(--neutral-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]" />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Mode Operasi</label>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setModeInput("production")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  modeInput === "production"
                    ? "border-[var(--primary)] bg-[var(--neutral-bg)] ring-1 ring-[var(--primary)]"
                    : "border-[var(--neutral-border)] bg-[var(--neutral-bg)] hover:border-[var(--text-muted)]"
                }`}>
                <div className="font-semibold text-xs flex items-center justify-between w-full text-[var(--text-primary)]">
                  <span>PRODUCTION</span>
                  {modeInput === "production" && <Check className="w-3.5 h-3.5 text-emerald-500" />}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  Prefiks <code className="font-mono">ngw_prod_</code> untuk pengiriman sungguhan.
                </p>
              </button>
              <button type="button" onClick={() => setModeInput("sandbox")}
                className={`p-3 rounded-xl border text-left transition-all ${
                  modeInput === "sandbox"
                    ? "border-[var(--primary)] bg-[var(--neutral-bg)] ring-1 ring-[var(--primary)]"
                    : "border-[var(--neutral-border)] bg-[var(--neutral-bg)] hover:border-[var(--text-muted)]"
                }`}>
                <div className="font-semibold text-xs flex items-center justify-between w-full text-[var(--text-primary)]">
                  <span>SANDBOX</span>
                  {modeInput === "sandbox" && <Check className="w-3.5 h-3.5 text-amber-500" />}
                </div>
                <p className="text-[11px] text-[var(--text-secondary)] mt-1">
                  Prefiks <code className="font-mono">ngw_sand_</code> untuk pengujian aman (mock).
                </p>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--neutral-border)]">
            <button type="button" onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--neutral-bg)] rounded-lg transition-colors">
              Batal
            </button>
            <button type="submit" disabled={isSubmitting || !labelInput.trim() || !projectId}
              className="px-4 py-2 text-xs font-medium bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-[var(--on-primary)] rounded-lg transition-colors flex items-center gap-1.5">
              {isSubmitting ? (<><div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />Membuat...</>) : "Buat Key Sekarang"}
            </button>
          </div>
        </form>
      </Modal>
      {/* Modal: Secret Key (tampil 1x) */}
      <Modal isOpen={!!createdSecretKey} onClose={() => setCreatedSecretKey(null)} title="Simpan API Key Anda" maxWidth="max-w-lg">
        <div className="space-y-4">
          <Alert variant="warning" title="Kunci ini HANYA ditampilkan 1 kali">
            Demi keamanan, kunci mentah tidak disimpan di database (hanya hash bcrypt). Jika hilang, buat API Key baru.
          </Alert>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">API Key Mentah (Secret Key)</label>
            <div className="relative flex items-center">
              <input type="text" readOnly value={createdSecretKey || ""}
                className="w-full pl-3.5 pr-24 py-2.5 text-xs font-mono bg-[var(--neutral-bg)] text-emerald-600 dark:text-emerald-400 border border-[var(--neutral-border)] rounded-lg focus:outline-none" />
              <button onClick={handleCopySecret}
                className="absolute right-2 px-3 py-1.5 text-xs font-medium bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] rounded-md transition-colors flex items-center gap-1.5">
                {copiedSecret ? (<><Check className="w-3.5 h-3.5" />Disalin!</>) : (<><Copy className="w-3.5 h-3.5" />Salin</>)}
              </button>
            </div>
          </div>
          <div className="pt-4 border-t border-[var(--neutral-border)] flex justify-end">
            <button onClick={() => setCreatedSecretKey(null)}
              className="px-5 py-2.5 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-[var(--on-primary)] font-semibold text-xs rounded-lg transition-colors">
              Saya Sudah Menyimpan Key Ini
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Edit API Key */}
      <Modal isOpen={!!editingKey} onClose={() => setEditingKey(null)} title="Edit API Key" maxWidth="max-w-md">
        <form onSubmit={handleConfirmEdit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Nama / Label API Key</label>
            <input type="text" required value={editName} onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-[var(--neutral-bg)] border border-[var(--neutral-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]" />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={() => setEditingKey(null)}
              className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--neutral-bg)] rounded-lg transition-colors">Batal</button>
            <button type="submit" disabled={!editName.trim()}
              className="px-4 py-2 text-xs font-medium bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-50 text-[var(--on-primary)] rounded-lg transition-colors">
              Simpan Perubahan
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Nonaktifkan API Key */}
      <Modal isOpen={!!keyToDeactivate} onClose={() => setKeyToDeactivate(null)} title="Nonaktifkan API Key?" maxWidth="max-w-sm">
        <div className="space-y-4">
          <Alert variant="warning">
            API Key <span className="font-semibold">&quot;{keyToDeactivate?.name}&quot;</span> akan ditolak sistem untuk semua request selanjutnya. Tindakan ini tidak dapat dibatalkan.
          </Alert>
          <div className="flex items-center justify-end gap-2.5">
            <button onClick={() => setKeyToDeactivate(null)}
              className="px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--neutral-bg)] rounded-lg transition-colors">Batal</button>
            <button onClick={handleConfirmDeactivate}
              className="px-3.5 py-2 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
              Ya, Nonaktifkan
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Hapus API Key */}
      <Modal isOpen={!!keyToDelete} onClose={() => setKeyToDelete(null)} title="Hapus API Key" maxWidth="max-w-sm">
        <div className="space-y-4">
          <Alert variant="error">
            Yakin menghapus API Key <span className="font-semibold">&quot;{keyToDelete?.name}&quot;</span> secara permanen? Aplikasi yang memakai key ini akan berhenti berfungsi.
          </Alert>
          <div className="flex items-center justify-end gap-2.5">
            <button onClick={() => setKeyToDelete(null)}
              className="px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--neutral-bg)] rounded-lg transition-colors">Batal</button>
            <button onClick={handleConfirmDelete}
              className="px-3.5 py-2 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">
              Ya, Hapus Permanen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}