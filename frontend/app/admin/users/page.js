"use client";

import { useState } from "react";
import { Plus, Eye, EyeOff, RefreshCw, Copy, Check, UserCheck, UserX, Trash2, Loader2, KeyRound, Edit } from "lucide-react";
import DataTable from "@/components/admin/DataTable";
import Modal from "@/components/admin/Modal";
import StatusBadge from "@/components/shared/StatusBadge";
import { useUsers } from "@/hooks/useUsers";
import { useAuth } from "@/lib/auth-context";

const EMPTY_FORM = { name: "", email: "", password: "", role: "user", project_name: "", quota_daily: "", rate_limit: "" };

/** UsersPage — Kelola Pengguna: admin membuat akun login untuk client (DESIGN.md 6B.5). */
export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const { users, loading, error, createUser, setUserStatus, deleteUser, updateUser, refetch } = useUsers();

  // Create modal state
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editingUserId, setEditingUserId] = useState(null);

  // Credentials modal (setelah akun berhasil dibuat)
  const [createdCreds, setCreatedCreds] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  // Confirm action modal
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'suspend'|'activate'|'delete', user }
  const [actionLoading, setActionLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setEdit = (key) => (e) => setEditForm((f) => ({ ...f, [key]: e.target.value }));

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%";
    let pwd = "";
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
    setForm((f) => ({ ...f, password: pwd }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowPassword(false);
  };

  const resetEditForm = () => {
    setEditForm(EMPTY_FORM);
    setEditingUserId(null);
    setFormError(null);
  };

  const handleEdit = (user) => {
    setEditingUserId(user.id);
    setEditForm({
      name: user.name || "",
      email: user.email || "",
      password: "", // Password tidak diisi, biarkan kosong jika tidak ingin diubah
      role: user.role || "user",
      project_name: user.project_name || "",
      quota_daily: user.quota_daily || "",
      rate_limit: user.rate_limit || "",
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const payload = {
        name: editForm.name.trim(),
        email: editForm.email.trim(),
        role: editForm.role,
        project_name: editForm.project_name.trim() || null,
        quota_daily: editForm.quota_daily ? Number(editForm.quota_daily) : null,
        rate_limit: editForm.rate_limit ? Number(editForm.rate_limit) : null,
      };
      // Password hanya diupdate jika diisi
      if (editForm.password) {
        payload.password = editForm.password;
      }
      await updateUser(editingUserId, payload);
      setShowEditModal(false);
      resetEditForm();
    } catch (err) {
      setFormError(err.message || "Gagal mengupdate akun.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        project_name: form.project_name.trim() || null,
        quota_daily: form.quota_daily ? Number(form.quota_daily) : null,
        rate_limit: form.rate_limit ? Number(form.rate_limit) : null,
      };
      await createUser(payload);
      setShowModal(false);
      setCreatedCreds({ email: payload.email, password: payload.password, name: payload.name, role: payload.role });
      resetForm();
    } catch (err) {
      setFormError(err.message || "Gagal membuat akun.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    setActionLoading(true);
    try {
      const { type, user } = confirmAction;
      if (type === "delete") await deleteUser(user.id);
      else await setUserStatus(user.id, type === "activate");
      setConfirmAction(null);
    } catch (err) {
      alert(err.message || "Aksi gagal.");
    } finally {
      setActionLoading(false);
    }
  };

  const copyText = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const columns = [
    { key: "name", label: "Nama", render: (v) => <span className="text-sm font-medium">{v || "—"}</span> },
    { key: "email", label: "Email", render: (v) => <span className="text-xs">{v}</span> },
    {
      key: "role", label: "Role",
      render: (v) => (
        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
          v === "admin" ? "bg-[var(--admin-badge-bg)] text-[var(--admin-badge-text)]" : "bg-[var(--client-badge-bg)] text-[var(--client-badge-text)]"
        }`}>{v === "user" ? "client" : v}</span>
      ),
    },
    {
      key: "last_login_at", label: "Login Terakhir", mono: true,
      render: (v) => <span className="text-xs">{v ? new Date(v).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Belum pernah"}</span>,
    },
    {
      key: "is_active", label: "Status",
      render: (v) => <StatusBadge status={v ? "ACTIVE" : "SUSPENDED"} />,
    },
    {
      key: "id", label: "Aksi", className: "text-right",
      render: (_, row) => {
        const isSelf = row.id === currentUser?.id;
        return (
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={() => handleEdit(row)}
              title="Edit akun"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <Edit size={14} />
            </button>
            <button
              disabled={isSelf}
              onClick={() => setConfirmAction({ type: row.is_active ? "suspend" : "activate", user: row })}
              title={row.is_active ? "Suspend akun" : "Aktifkan akun"}
              className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {row.is_active ? <UserX size={14} /> : <UserCheck size={14} />}
            </button>
            <button
              disabled={isSelf}
              onClick={() => setConfirmAction({ type: "delete", user: row })}
              title="Hapus akun"
              className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        );
      },
    },
  ];

  const inputCls = "w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]";
  const labelCls = "block text-xs font-medium text-[var(--text-secondary)] mb-1.5";
  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Kelola Pengguna</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Buat akun login untuk client. Client menggunakan email & password yang Anda buatkan di sini.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={refetch}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Plus size={14} /> Buat Akun Client
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-lg bg-[var(--status-failed-bg)] text-[var(--status-failed-text)] text-xs">
          {error} — pastikan auth-service berjalan.
        </div>
      )}

      {loading && users.length === 0 ? (
        <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-12 text-center text-sm text-[var(--text-muted)]">
          Memuat data pengguna...
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={users}
          emptyTitle="Belum ada pengguna"
          emptyDescription="Buat akun client pertama dengan tombol 'Buat Akun Client'."
        />
      )}

      {/* Modal: Buat Akun Client */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title="Buat Akun Client Baru">
        <form onSubmit={handleCreate} className="space-y-4">
          {formError && (
            <div className="px-3 py-2.5 rounded-lg bg-[var(--status-failed-bg)] text-[var(--status-failed-text)] text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className={labelCls} htmlFor="cu-name">Nama Lengkap / Perusahaan</label>
            <input id="cu-name" type="text" required value={form.name} onChange={set("name")} placeholder="e.g. Budi Santoso — PT Maju Jaya" className={inputCls} />
          </div>

          <div>
            <label className={labelCls} htmlFor="cu-email">Email (untuk login)</label>
            <input id="cu-email" type="email" required value={form.email} onChange={set("email")} placeholder="client@company.com" autoComplete="off" className={inputCls} />
          </div>

          <div>
            <label className={labelCls} htmlFor="cu-password">Password</label>
            <div className="relative">
              <input
                id="cu-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={8}
                value={form.password}
                onChange={set("password")}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
                className={`${inputCls} pr-20 font-mono`}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button type="button" onClick={generatePassword} title="Generate password acak" className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <KeyRound size={14} />
                </button>
                <button type="button" onClick={() => setShowPassword(!showPassword)} title={showPassword ? "Sembunyikan" : "Tampilkan"} className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
              Password ini akan Anda berikan ke client untuk login pertama kali.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="cu-role">Role</label>
              <select id="cu-role" value={form.role} onChange={set("role")} className={inputCls}>
                <option value="user">Client (User)</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="cu-project">Project <span className="text-red-500">*</span></label>
              <input id="cu-project" type="text" required value={form.project_name} onChange={set("project_name")} placeholder="e.g. kasir-pos" className={`${inputCls} font-mono`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="cu-quota">Kuota Harian <span className="text-red-500">*</span></label>
              <input id="cu-quota" type="number" required min="0" value={form.quota_daily} onChange={set("quota_daily")} placeholder="25000" className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className={labelCls} htmlFor="cu-rate">Rate Limit/menit <span className="text-red-500">*</span></label>
              <input id="cu-rate" type="number" required min="0" value={form.rate_limit} onChange={set("rate_limit")} placeholder="60" className={`${inputCls} font-mono`} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--neutral-border)]">
            <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] border border-[var(--neutral-border)] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              Batal
            </button>
            <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors">
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Membuat..." : "Buat Akun"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Edit Akun */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); resetEditForm(); }} title="Edit Akun Pengguna" maxWidth="max-w-lg">
        <form onSubmit={handleUpdate} className="space-y-4">
          {formError && (
            <div className="px-3 py-2.5 rounded-lg bg-[var(--status-failed-bg)] text-[var(--status-failed-text)] text-xs">
              {formError}
            </div>
          )}

          <div>
            <label className={labelCls} htmlFor="eu-name">Nama Lengkap</label>
            <input id="eu-name" type="text" required value={editForm.name} onChange={setEdit("name")} placeholder="e.g. Budi Santoso" className={inputCls} />
          </div>

          <div>
            <label className={labelCls} htmlFor="eu-email">Email</label>
            <input id="eu-email" type="email" required value={editForm.email} onChange={setEdit("email")} placeholder="client@perusahaan.co.id" className={inputCls} />
          </div>

          <div>
            <label className={labelCls} htmlFor="eu-password">Password Baru (kosongkan jika tidak ingin mengubah)</label>
            <div className="relative">
              <input id="eu-password" type={showPassword ? "text" : "password"} value={editForm.password} onChange={setEdit("password")} placeholder="Biarkan kosong untuk tidak mengubah" className={`${inputCls} pr-16`} />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button type="button" onClick={() => setShowPassword(!showPassword)} title={showPassword ? "Sembunyikan" : "Tampilkan"} className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="eu-role">Role</label>
              <select id="eu-role" value={editForm.role} onChange={setEdit("role")} className={inputCls}>
                <option value="user">Client (User)</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="eu-project">Project <span className="text-red-500">*</span></label>
              <input id="eu-project" type="text" required value={editForm.project_name} onChange={setEdit("project_name")} placeholder="e.g. kasir-pos" className={`${inputCls} font-mono`} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="eu-quota">Kuota Harian <span className="text-red-500">*</span></label>
              <input id="eu-quota" type="number" required min="0" value={editForm.quota_daily} onChange={setEdit("quota_daily")} placeholder="25000" className={`${inputCls} font-mono`} />
            </div>
            <div>
              <label className={labelCls} htmlFor="eu-rate">Rate Limit/menit <span className="text-red-500">*</span></label>
              <input id="eu-rate" type="number" required min="0" value={editForm.rate_limit} onChange={setEdit("rate_limit")} placeholder="60" className={`${inputCls} font-mono`} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--neutral-border)]">
            <button type="button" onClick={() => { setShowEditModal(false); resetEditForm(); }}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] border border-[var(--neutral-border)] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              Batal
            </button>
            <button type="submit" disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors">
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Mengupdate..." : "Update Akun"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Kredensial Akun Baru */}
      <Modal isOpen={!!createdCreds} onClose={() => setCreatedCreds(null)} title="Akun Berhasil Dibuat" maxWidth="max-w-md">
        {createdCreds && (
          <div className="space-y-4">
            <div className="px-3 py-2.5 rounded-lg bg-[var(--status-queued-bg)] text-[var(--status-queued-text)] text-xs">
              Simpan kredensial ini dan berikan ke client. Password tidak ditampilkan lagi setelah modal ditutup.
            </div>
            {[
              ["Nama", createdCreds.name],
              ["Role", createdCreds.role === "user" ? "Client" : "Admin"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4">
                <span className="text-xs text-[var(--text-muted)]">{label}</span>
                <span className="text-xs font-medium text-[var(--text-primary)]">{value}</span>
              </div>
            ))}
            {[
              ["Email", createdCreds.email, "email"],
              ["Password", createdCreds.password, "password"],
            ].map(([label, value, field]) => (
              <div key={label}>
                <p className="text-xs text-[var(--text-muted)] mb-1.5">{label}</p>
                <div className="relative">
                  <input type="text" readOnly value={value}
                    className="w-full pl-3 pr-14 py-2.5 text-xs font-mono bg-zinc-950 text-emerald-400 border border-zinc-800 rounded-lg focus:outline-none" />
                  <button onClick={() => copyText(value, field)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-md transition-colors">
                    {copiedField === field ? <><Check size={12} /> Disalin</> : <><Copy size={12} /> Salin</>}
                  </button>
                </div>
              </div>
            ))}
            <button onClick={() => setCreatedCreds(null)}
              className="w-full px-4 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors">
              Saya Sudah Menyimpan Kredensial
            </button>
          </div>
        )}
      </Modal>

      {/* Modal: Konfirmasi Aksi */}
      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={
        confirmAction?.type === "delete" ? "Hapus Akun?" :
        confirmAction?.type === "suspend" ? "Suspend Akun?" : "Aktifkan Akun?"
      } maxWidth="max-w-sm">
        {confirmAction && (
          <div className="space-y-4">
            <p className="text-xs text-[var(--text-secondary)]">
              {confirmAction.type === "delete" && (
                <>Akun <span className="font-semibold text-[var(--text-primary)]">{confirmAction.user.email}</span> akan dihapus permanen dan tidak bisa login lagi. Tindakan ini tidak dapat dibatalkan.</>
              )}
              {confirmAction.type === "suspend" && (
                <>Akun <span className="font-semibold text-[var(--text-primary)]">{confirmAction.user.email}</span> akan di-suspend dan tidak bisa login sampai diaktifkan kembali.</>
              )}
              {confirmAction.type === "activate" && (
                <>Akun <span className="font-semibold text-[var(--text-primary)]">{confirmAction.user.email}</span> akan diaktifkan kembali dan bisa login.</>
              )}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)}
                className="px-3.5 py-2 text-xs font-medium text-[var(--text-secondary)] border border-[var(--neutral-border)] rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                Batal
              </button>
              <button onClick={handleConfirmAction} disabled={actionLoading}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-white rounded-lg disabled:opacity-50 transition-colors ${
                  confirmAction.type === "activate" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700"
                }`}>
                {actionLoading && <Loader2 size={12} className="animate-spin" />}
                {confirmAction.type === "delete" ? "Ya, Hapus" : confirmAction.type === "suspend" ? "Ya, Suspend" : "Ya, Aktifkan"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
