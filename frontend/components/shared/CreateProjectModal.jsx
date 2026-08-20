// =============================================================================
// Shared Component: CreateProjectModal (Frontend)
// Modal untuk membuat project (client_app) baru — konteks untuk Template,
// API Key, Broadcast, dsb. Mengikuti token warna DESIGN.md (dark mode compatible).
// =============================================================================

"use client";

import { useState } from "react";
import { FolderPlus, X } from "lucide-react";
import { useProjects } from "@/hooks/useProjects";

/**
 * CreateProjectModal — Form buat project baru.
 * @param {object} props
 * @param {boolean} props.isOpen - Tampilkan modal
 * @param {() => void} props.onClose - Tutup modal
 * @param {(project: object) => void} [props.onCreated] - Callback setelah project dibuat
 */
export default function CreateProjectModal({ isOpen, onClose, onCreated }) {
  const { createProject } = useProjects();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  // Auto-generate slug dari nama (hanya jika user belum mengedit slug manual)
  const handleNameChange = (val) => {
    setName(val);
    if (!slugTouched) {
      setSlug(
        val.toLowerCase().trim()
          .replace(/[^a-z0-9\s-]/g, "")
          .replace(/[\s_]+/g, "-")
          .replace(/-+/g, "-")
          .replace(/^-|-$/g, "")
      );
    }
  };

  const resetForm = () => {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setDescription("");
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = { name: name.trim(), slug: slug.trim() };
      if (description.trim()) payload.description = description.trim();
      const created = await createProject(payload);
      resetForm();
      onClose();
      if (onCreated) onCreated(created);
    } catch (err) {
      setError(err.message || "Gagal membuat project");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">Buat Project Baru</h3>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Nama Project</label>
            <input type="text" required placeholder="Misal: Aplikasi Kasir" value={name} onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Slug <span className="font-normal text-gray-400">(unik, huruf kecil/angka/strip)</span>
            </label>
            <input type="text" required placeholder="misal: aplikasi-kasir" value={slug}
              onChange={(e) => { setSlugTouched(true); setSlug(e.target.value); }}
              className="w-full px-3.5 py-2 text-sm font-mono bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Deskripsi <span className="font-normal text-gray-400">(opsional)</span>
            </label>
            <textarea rows={2} placeholder="Kegunaan project ini..." value={description} onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button type="button" onClick={handleClose}
              className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
              Batal
            </button>
            <button type="submit" disabled={submitting || !name.trim() || !slug.trim()}
              className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5">
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Membuat...
                </>
              ) : (
                "Buat Project"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
