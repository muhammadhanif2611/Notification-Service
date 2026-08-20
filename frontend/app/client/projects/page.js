"use client";

// =============================================================================
// Halaman Projects (Client)
// Fitur terpisah untuk mengelola project (client_app): buat, edit, hapus.
// Project yang dipilih di sini menjadi konteks global untuk API Key, Template,
// Broadcast, dll. Mengikuti token warna DESIGN.md (dark mode compatible).
// =============================================================================

import { useState } from "react";
import { FolderKanban, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import Modal from "@/components/admin/Modal";
import { useProjectContext } from "@/lib/project-context";
import { apiPost, apiPut, apiDelete } from "@/lib/api";

export default function ProjectsPage() {
  const { projects, activeProjectId, selectProject, loading, refetch } = useProjectContext();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const emptyForm = { name: "", slug: "", description: "" };
  const [form, setForm] = useState(emptyForm);

  const handleNameChange = (val) => {
    setForm((f) => ({
      ...f,
      name: val,
      slug: f.slugTouched ? f.slug : val.toLowerCase().trim()
        .replace(/[^a-z0-9\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""),
    }));
  };

  const openCreate = () => { setForm(emptyForm); setError(null); setShowCreate(true); };
  const openEdit = (p) => {
    setForm({ name: p.name, slug: p.slug, description: p.description || "" });
    setError(null);
    setEditing(p);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const payload = { name: form.name.trim(), slug: form.slug.trim() };
      if (form.description.trim()) payload.description = form.description.trim();
      const res = await apiPost("/v1/clients/projects", payload);
      await refetch();
      setShowCreate(false);
      if (res?.data?.id) selectProject(res.data.id);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      await apiPut(`/v1/clients/projects/${editing.id}`, {
        name: form.name.trim(), slug: form.slug.trim(), description: form.description.trim(),
      });
      await refetch();
      setEditing(null);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true); setError(null);
    try {
      await apiDelete(`/v1/clients/projects/${deleting.id}`);
      await refetch();
      setDeleting(null);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  const formFields = (
    <>
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Nama Project</label>
        <input type="text" required value={form.name} onChange={(e) => handleNameChange(e.target.value)}
          placeholder="Misal: Aplikasi Kasir"
          className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]" />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Slug <span className="text-[var(--text-muted)] font-normal">(unik)</span></label>
        <input type="text" required value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value, slugTouched: true }))}
          placeholder="misal: aplikasi-kasir"
          className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]" />
      </div>
      <div>
        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Deskripsi <span className="text-[var(--text-muted)] font-normal">(opsional)</span></label>
        <textarea rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Kegunaan project ini..."
          className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]" />
      </div>
    </>
  );
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Projects</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Kelola project Anda. Project yang dipilih menjadi konteks untuk API Key, Template, dan Broadcast.
          </p>
        </div>
        <button onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors">
          <Plus size={14} /> Buat Project
        </button>
      </div>

      {/* Daftar project */}
      {loading ? (
        <div className="py-16 text-center text-sm text-[var(--text-muted)]">Memuat project...</div>
      ) : projects.length === 0 ? (
        <div className="py-16 text-center bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl">
          <FolderKanban size={32} className="mx-auto text-[var(--text-muted)] mb-3" />
          <p className="text-sm font-medium text-[var(--text-primary)]">Belum ada project</p>
          <p className="text-xs text-[var(--text-secondary)] mt-1 mb-4">Buat project pertama untuk mulai mengirim notifikasi.</p>
          <button onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)]">
            <Plus size={14} /> Buat Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => {
            const isActive = p.id === activeProjectId;
            return (
              <div key={p.id}
                className={`relative bg-[var(--neutral-surface)] border rounded-xl p-4 transition-colors ${isActive ? "border-[var(--primary)] ring-1 ring-[var(--primary)]" : "border-[var(--neutral-border)]"}`}>
                {isActive && (
                  <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[var(--primary)] text-[var(--on-primary)]">
                    <Check size={10} /> Aktif
                  </span>
                )}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
                    <FolderKanban size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{p.name}</p>
                    <p className="text-xs font-mono text-[var(--text-muted)] truncate">{p.slug}</p>
                  </div>
                </div>
                {p.description && (
                  <p className="text-xs text-[var(--text-secondary)] mt-3 line-clamp-2">{p.description}</p>
                )}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-[var(--neutral-border)]">
                  {!isActive && (
                    <button onClick={() => selectProject(p.id)} className="text-xs font-medium text-[var(--primary)] hover:underline">
                      Pilih
                    </button>
                  )}
                  <div className="flex-1" />
                  <button onClick={() => openEdit(p)} title="Edit project"
                    className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--neutral-bg)] transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => { setError(null); setDeleting(p); }} title="Hapus project"
                    className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* Modal Buat */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Buat Project Baru" maxWidth="max-w-md">
        <form onSubmit={handleCreate} className="space-y-4">
          {formFields}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowCreate(false)}
              className="px-4 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--neutral-bg)]">Batal</button>
            <button type="submit" disabled={saving || !form.name.trim() || !form.slug.trim()}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50">
              {saving ? "Menyimpan..." : "Buat Project"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Project" maxWidth="max-w-md">
        <form onSubmit={handleUpdate} className="space-y-4">
          {formFields}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--neutral-bg)]">Batal</button>
            <button type="submit" disabled={saving || !form.name.trim() || !form.slug.trim()}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Hapus */}
      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Hapus Project" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Yakin ingin menghapus project <span className="font-semibold text-[var(--text-primary)]">{deleting?.name}</span>?
            Semua API Key dan Template di dalamnya akan ikut terhapus. Tindakan ini tidak dapat dibatalkan.
          </p>
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300">{error}</div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeleting(null)}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--neutral-bg)]">
              <X size={14} />Batal
            </button>
            <button type="button" onClick={handleDelete} disabled={saving}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50">
              {saving ? "Menghapus..." : "Ya, Hapus"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
