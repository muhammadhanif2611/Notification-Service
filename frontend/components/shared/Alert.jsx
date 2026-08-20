"use client";

// =============================================================================
// Alert — Komponen notifikasi inline standar (konsisten di seluruh aplikasi).
// Mengikuti token warna DESIGN.md (border-first, rounded-xl, dark-mode aware).
//
// Usage:
//   import Alert from "@/components/shared/Alert";
//   <Alert variant="error" title="Gagal">Pesan detail di sini.</Alert>
//   <Alert variant="warning" onClose={() => setErr(null)}>Hati-hati.</Alert>
// =============================================================================

import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    wrap: "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  error: {
    icon: XCircle,
    wrap: "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300",
    iconColor: "text-red-600 dark:text-red-400",
  },
  warning: {
    icon: AlertTriangle,
    wrap: "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  info: {
    icon: Info,
    wrap: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
};

/**
 * @param {"success"|"error"|"warning"|"info"} variant
 * @param {string} [title] - Judul tebal opsional di awal
 * @param {Function} [onClose] - Jika diberikan, tampilkan tombol tutup
 */
export default function Alert({ variant = "info", title, children, onClose, className = "" }) {
  const v = VARIANTS[variant] || VARIANTS.info;
  const Icon = v.icon;

  return (
    <div
      role="alert"
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs leading-relaxed ${v.wrap} ${className}`}
    >
      <Icon size={16} className={`shrink-0 mt-0.5 ${v.iconColor}`} />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold mb-0.5">{title}</p>}
        <div>{children}</div>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup"
          className="shrink-0 p-0.5 rounded-md opacity-70 hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
