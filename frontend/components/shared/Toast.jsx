"use client";

// =============================================================================
// Toast — Notifikasi melayang (menggantikan alert() bawaan browser).
// Mengikuti token warna DESIGN.md & gaya Alert.jsx (border-first, rounded-xl,
// dark-mode aware), plus auto-dismiss & animasi slide-in.
//
// Tidak dipakai langsung — gunakan hook useToast() dari lib/toast-context.
// =============================================================================

import { useEffect } from "react";
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

const DEFAULT_TITLE = {
  success: "Berhasil",
  error: "Gagal",
  warning: "Perhatian",
  info: "Info",
};

/**
 * Satu item toast.
 * @param {{ id:number, variant:string, title?:string, message:string }} toast
 * @param {Function} onClose - dipanggil saat toast ditutup
 */
function ToastItem({ toast, onClose }) {
  const v = VARIANTS[toast.variant] || VARIANTS.info;
  const Icon = v.icon;

  useEffect(() => {
    const t = setTimeout(onClose, toast.duration ?? 4000);
    return () => clearTimeout(t);
  }, [onClose, toast.duration]);

  return (
    <div
      role="alert"
      className={`pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] items-start gap-2.5 rounded-xl border px-3.5 py-3 text-xs leading-relaxed shadow-[var(--shadow-xl)] bg-[var(--neutral-surface)] animate-toast-in ${v.wrap}`}
    >
      <Icon size={16} className={`shrink-0 mt-0.5 ${v.iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold mb-0.5">{toast.title || DEFAULT_TITLE[toast.variant] || DEFAULT_TITLE.info}</p>
        <div>{toast.message}</div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Tutup"
        className="shrink-0 p-0.5 rounded-md opacity-70 hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * ToastViewport — container yang merender semua toast aktif (fixed, kanan atas).
 * @param {Array} toasts
 * @param {Function} onDismiss
 */
export default function ToastViewport({ toasts, onDismiss }) {
  return (
    <div className="pointer-events-none fixed top-4 right-4 z-[100] flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onClose={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}
