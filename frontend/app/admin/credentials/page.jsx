"use client";

import { useState } from "react";
import { Shield, Eye, EyeOff, Copy, Check, Lock, RefreshCw } from "lucide-react";
import DataTable from "@/components/shared/DataTable";
import { useAdminData } from "@/hooks/useAdminData";

/**
 * Credentials Page — Manajemen API Secret Key vendor.
 * DESIGN.md 6B.2: Masked credentials, copy/reveal toggle, AES-256-GCM indicator.
 */

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      aria-label="Copy"
    >
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  );
}

export default function CredentialsPage() {
  const { vendors, loading, refetch } = useAdminData();
  const [revealedIds, setRevealedIds] = useState(new Set());

  const toggleReveal = (id) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const columns = [
    {
      key: "name",
      label: "Vendor",
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <Shield size={14} className="text-[var(--text-muted)]" />
          <span className="font-medium">{val}</span>
        </div>
      ),
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
            <span className="text-xs text-emerald-700 dark:text-emerald-400">Active</span>
          ) : (
            <span className="text-xs text-[var(--text-muted)]">Inactive</span>
          )}
        </span>
      ),
    },
    {
      key: "created_at",
      label: "Created At",
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
        <div className="flex items-center gap-1">
          <button
            onClick={() => toggleReveal(row.id)}
            className="p-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            {revealedIds.has(row.id) ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <CopyButton text={JSON.stringify(row, null, 2)} />
        </div>
      ),
    },
  ];

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">
          Vendor Credentials
        </h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Manajemen API Secret Key vendor — terenkripsi AES-256-GCM.
        </p>
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20">
        <Lock size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Kredensial terenkripsi
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-400/80 mt-0.5">
            Semua secret key disimpan dengan enkripsi AES-256-GCM. Key dekripsi hanya tersedia di environment variable server.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={vendors}
        loading={loading}
        emptyTitle="Belum ada kredensial vendor"
        emptyDescription="Kredensial akan muncul setelah vendor ditambahkan."
      />
    </>
  );
}
