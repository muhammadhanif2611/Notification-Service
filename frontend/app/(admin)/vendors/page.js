"use client";

import { useState } from "react";
import { Plus, MoreHorizontal, Wifi, WifiOff } from "lucide-react";
import DataTable from "@/components/admin/DataTable";
import Modal from "@/components/admin/Modal";

/**
 * Vendors Page — Manajemen integrasi vendor provider.
 * DESIGN.md 6B.2: WhatsApp, Email, SMS providers. Rate limit TPS, fallback routing, API key management.
 */

const MOCK_VENDORS = [
  { id: "1", name: "Meta WhatsApp Cloud", channel: "WHATSAPP", tps: 80, priority: 1, is_active: true, fallback_weight: 100 },
  { id: "2", name: "Twilio WhatsApp", channel: "WHATSAPP", tps: 50, priority: 2, is_active: true, fallback_weight: 0 },
  { id: "3", name: "SendGrid", channel: "EMAIL", tps: 200, priority: 1, is_active: true, fallback_weight: 70 },
  { id: "4", name: "Amazon SES", channel: "EMAIL", tps: 500, priority: 2, is_active: true, fallback_weight: 30 },
  { id: "5", name: "Postmark", channel: "EMAIL", tps: 100, priority: 3, is_active: false, fallback_weight: 0 },
  { id: "6", name: "Telkomsel SMS", channel: "SMS", tps: 30, priority: 1, is_active: true, fallback_weight: 100 },
];

const CHANNEL_BADGE = {
  WHATSAPP: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  EMAIL: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  SMS: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
};

export default function VendorsPage() {
  const [showModal, setShowModal] = useState(false);

  const columns = [
    { key: "name", label: "Vendor Name" },
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
      key: "tps",
      label: "Rate Limit (TPS)",
      mono: true,
      render: (val) => <span>{val} req/s</span>,
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
      key: "fallback_weight",
      label: "Fallback Weight",
      mono: true,
      render: (val) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 max-w-[80px]">
            <div
              className="h-full rounded-full bg-[var(--primary)]"
              style={{ width: `${val}%` }}
            />
          </div>
          <span className="text-xs">{val}%</span>
        </div>
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
      render: () => (
        <button className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
          <MoreHorizontal size={16} />
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
            Manajemen integrasi penyedia layanan WhatsApp, Email, dan SMS.
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
        data={MOCK_VENDORS}
        emptyTitle="Belum ada vendor terdaftar"
        emptyDescription="Tambahkan vendor provider untuk mulai mengirim notifikasi."
      />

      {/* Add Vendor Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Tambah Vendor Baru">
        <form className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Nama Vendor</label>
            <input
              type="text"
              placeholder="e.g. Meta WhatsApp Cloud"
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Channel</label>
              <select className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]">
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
                <option value="SMS">SMS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Rate Limit (TPS)</label>
              <input
                type="number"
                placeholder="100"
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Priority</label>
              <input
                type="number"
                placeholder="1"
                min="1"
                max="10"
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Fallback Weight (%)</label>
              <input
                type="number"
                placeholder="100"
                min="0"
                max="100"
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]"
              />
            </div>
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
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors"
            >
              Simpan
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
