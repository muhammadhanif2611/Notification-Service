"use client";

// =============================================================================
// Toast Context — State global notifikasi toast.
// Menyediakan hook useToast() untuk memunculkan notifikasi dari komponen mana
// pun, menggantikan alert() bawaan browser.
//
// Usage:
//   import { useToast } from "@/lib/toast-context";
//   const toast = useToast();
//   toast.success("Tersimpan.");            // judul otomatis "Berhasil"
//   toast.error("Gagal: " + err.message);   // judul otomatis "Gagal"
//   toast.warning("Hati-hati.");
//   toast.info("Info tambahan.");
//   toast.success({ title: "Vendor", message: "Ditambahkan." }); // judul kustom
// =============================================================================

import { createContext, useCallback, useContext, useRef, useState } from "react";
import ToastViewport from "@/components/shared/Toast";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback((variant, input) => {
    const id = ++idRef.current;
    const toast =
      typeof input === "string"
        ? { id, variant, message: input }
        : { id, variant, title: input.title, message: input.message, duration: input.duration };
    setToasts((prev) => [...prev.slice(-3), toast]); // maksimal 4 toast tampil
  }, []);

  const api = {
    success: (input) => push("success", input),
    error: (input) => push("error", input),
    warning: (input) => push("warning", input),
    info: (input) => push("info", input),
    dismiss,
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast harus dipakai di dalam <ToastProvider>");
  return ctx;
}
