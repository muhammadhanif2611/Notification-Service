"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import DataTable from "@/components/admin/DataTable";
import Modal from "@/components/admin/Modal";
import StatusBadge from "@/components/shared/StatusBadge";

const MOCK_USERS = [
  { id: "1", name: "Budi Santoso", email: "budi@maju-jaya.co.id", role: "user", project: "kasir-pos", quota: "25.000/hari", rate_limit: "60/mnt", status: "ACTIVE" },
  { id: "2", name: "Siti Rahma", email: "siti@hrd-corp.id", role: "user", project: "hrd-portal", quota: "10.000/hari", rate_limit: "30/mnt", status: "ACTIVE" },
  { id: "3", name: "Andi Wijaya", email: "andi@ecommerce.id", role: "user", project: "ecommerce-web", quota: "50.000/hari", rate_limit: "120/mnt", status: "SUSPENDED" },
  { id: "4", name: "Admin Platform", email: "admin@notification.id", role: "admin", project: "—", quota: "Unlimited", rate_limit: "—", status: "ACTIVE" },
];

/** UsersPage — Kelola Pengguna & Tenant Workspace (DESIGN.md 6B.5). */
export default function UsersPage() {
  const [showModal, setShowModal] = useState(false);

  const columns = [
    { key: "name", label: "Nama" },
    { key: "email", label: "Email", render: (v) => <span className="text-xs">{v}</span> },
    {
      key: "role", label: "Role",
      render: (v) => (
        <span className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${
          v === "admin" ? "bg-[var(--admin-badge-bg)] text-[var(--admin-badge-text)]" : "bg-[var(--client-badge-bg)] text-[var(--client-badge-text)]"
        }`}>{v}</span>
      ),
    },
    { key: "project", label: "Project", mono: true, render: (v) => <span className="text-xs">{v}</span> },
    { key: "quota", label: "Kuota Harian", mono: true, render: (v) => <span className="text-xs">{v}</span> },
    { key: "rate_limit", label: "Rate Limit", mono: true, render: (v) => <span className="text-xs">{v}</span> },
    { key: "status", label: "Status", render: (v) => <StatusBadge status={v} /> },
  ];

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Kelola Pengguna</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Manajemen akun klien, kuota harian, dan rate limit per proyek.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors"
        >
          <Plus size={14} /> Tambah Pengguna
        </button>
      </div>

      <DataTable
        columns={columns}
        data={MOCK_USERS}
        emptyTitle="Belum ada pengguna"
        emptyDescription="Tambahkan pengguna untuk memberikan akses ke platform."
      />

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Tambah Pengguna Baru">
        <form className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Nama Lengkap</label>
            <input type="text" placeholder="e.g. Budi Santoso"
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Email</label>
            <input type="email" placeholder="user@company.com"
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Role</label>
              <select className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Kuota Harian</label>
              <input type="number" placeholder="25000"
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--neutral-border)]">
            <button type="button" onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] border border-[var(--neutral-border)] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
              Batal
            </button>
            <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors">
              Simpan
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
