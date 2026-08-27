"use client";

import { useState } from "react";
import { FileText, Plus, Copy, Check, Pencil, Trash2 } from "lucide-react";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import Alert from "@/components/shared/Alert";
import StatusBadge from "@/components/shared/StatusBadge";
import { useProjectContext } from "@/lib/project-context";
import { useTemplates } from "@/hooks/useTemplates";

/**
 * TemplatesPage - Template Pesan per project aktif (konteks global sidebar).
 * Status awal PENDING hingga di-approve admin. Placeholder: {{nama}}, {{otp}}.
 */
export default function TemplatesPage() {
  const { activeProject } = useProjectContext();
  const projectId = activeProject?.id || null;
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate } = useTemplates(projectId);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const emptyForm = { name: "", code: "", channel: "WHATSAPP", subject: "", body: "", variables: "" };
  const [form, setForm] = useState(emptyForm);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const parseVariables = () => form.variables.split(",").map((v) => v.trim()).filter(Boolean);

  const openCreate = () => { setForm(emptyForm); setShowModal(true); };
  const openEdit = (t) => {
    setEditing(t);
    setForm({
      name: t.name, code: t.code, channel: t.channel,
      subject: t.subject || "", body: t.body,
      variables: Array.isArray(t.variables) ? t.variables.join(", ") : "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!projectId) { alert("Pilih project terlebih dahulu dari sidebar."); return; }
    setSaving(true);
    try {
      await createTemplate({
        projectId, name: form.name, code: form.code.toLowerCase().trim(),
        channel: form.channel,
        subject: form.channel === "EMAIL" ? form.subject : undefined,
        body: form.body, variables: parseVariables(),
      });
      setShowModal(false); setForm(emptyForm);
    } catch (err) { alert("Gagal membuat template: " + err.message); } finally { setSaving(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateTemplate(editing.id, {
        name: form.name,
        subject: form.channel === "EMAIL" ? form.subject : null,
        body: form.body, variables: parseVariables(),
      });
      setEditing(null);
    } catch (err) { alert("Gagal mengedit template: " + err.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setSaving(true);
    try { await deleteTemplate(deleting.id); setDeleting(null); }
    catch (err) { alert("Gagal menghapus template: " + err.message); } finally { setSaving(false); }
  };

  const columns = [
    {
      key: "code",
      label: "Kode",
      mono: true,
      render: (val) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-mono text-xs">{val}</span>
          <button
            onClick={(e) => { e.stopPropagation(); handleCopyCode(val); }}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Salin kode template"
          >
            {copiedCode === val ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
        </span>
      ),
    },
    { key: "name", label: "Nama", render: (val) => <span className="font-medium">{val}</span> },
    {
      key: "channel",
      label: "Channel",
      render: (val) => (
        <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase ${
          val === "WHATSAPP" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
        }`}>{val}</span>
      ),
    },
    {
      key: "variables",
      label: "Variabel",
      render: (val) => (
        <span className="text-xs font-mono text-[var(--text-secondary)]">
          {Array.isArray(val) && val.length > 0 ? val.map((v) => `{{${v}}}`).join(" ") : "—"}
        </span>
      ),
    },
    { key: "status", label: "Status", render: (val) => <StatusBadge status={val} /> },
    {
      key: "actions",
      label: "Aksi",
      render: (_, row) => (
        <span className="inline-flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--neutral-bg)] transition-colors"
            title="Edit template"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleting(row); }}
            className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title="Hapus template"
          >
            <Trash2 size={14} />
          </button>
        </span>
      ),
    },
  ];

  if (!activeProject) {
    return (
      <div className="py-16 text-center bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl">
        <FileText size={32} className="mx-auto text-[var(--text-muted)] mb-3" />
        <p className="text-sm font-medium text-[var(--text-primary)]">Belum ada project aktif</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Buat atau pilih project terlebih dahulu di halaman Projects.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Template Pesan</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Template untuk project <span className="font-semibold text-[var(--text-primary)]">{activeProject.name}</span>. Template baru berstatus PENDING hingga di-approve admin.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors"
        >
          <Plus size={14} /> Buat Template
        </button>
      </div>

      <DataTable
        columns={columns}
        data={templates}
        emptyTitle="Belum ada template"
        emptyDescription="Buat template pertama untuk project ini guna mempercepat pengiriman dan menjaga konsistensi pesan."
      />
      {/* Modal Buat Template */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Buat Template Baru" maxWidth="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Nama Template</label>
              <input type="text" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. OTP Verification"
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Kode (unik)</label>
              <input type="text" required value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. otp_verification"
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Channel</label>
              <select value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]">
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Variabel (pisah koma)</label>
              <input type="text" value={form.variables}
                onChange={(e) => setForm({ ...form, variables: e.target.value })}
                placeholder="e.g. nama, otp"
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]" />
            </div>
          </div>
          {form.channel === "EMAIL" && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Subject Email</label>
              <input type="text" value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Kode OTP Anda"
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Isi Pesan</label>
            <textarea rows={4} required value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              placeholder="Halo {{nama}}, kode OTP Anda adalah {{otp}}."
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--neutral-bg)]">Batal</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan Template"}
            </button>
          </div>
        </form>
      </Modal>
      {/* Modal Edit Template */}
      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Template" maxWidth="max-w-xl">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Nama Template</label>
              <input type="text" required value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Kode</label>
              <input type="text" value={form.code} disabled
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-muted)] opacity-60" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Variabel (pisah koma)</label>
            <input type="text" value={form.variables}
              onChange={(e) => setForm({ ...form, variables: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]" />
          </div>
          {form.channel === "EMAIL" && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Subject Email</label>
              <input type="text" value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Isi Pesan</label>
            <textarea rows={4} required value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]" />
          </div>
          <Alert variant="warning">
            Setelah diedit, status template kembali PENDING dan perlu di-approve ulang oleh admin.
          </Alert>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--neutral-bg)]">Batal</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Hapus Template */}
      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Hapus Template" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Yakin ingin menghapus template <span className="font-semibold text-[var(--text-primary)]">{deleting?.name}</span>?
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setDeleting(null)}
              className="px-4 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--neutral-bg)]">Batal</button>
            <button type="button" onClick={handleDelete} disabled={saving}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50">
              {saving ? "Menghapus..." : "Ya, Hapus"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}