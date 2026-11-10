"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/**
 * Modal — Dialog modal reusable (rounded-xl, shadow-xl sesuai DESIGN.md).
 * @param {object} props
 * @param {boolean} props.isOpen - Status buka/tutup modal
 * @param {function} props.onClose - Handler tutup modal
 * @param {string} props.title - Judul modal
 * @param {React.ReactNode} props.children - Konten modal
 * @param {string} [props.maxWidth] - Max width (default: "max-w-lg")
 * @returns {JSX.Element|null}
 */
export default function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleEsc = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 dark:bg-black/70" onClick={onClose} />

      {/* Dialog */}
      <div
        className={`relative flex flex-col max-h-[calc(100vh-1.5rem)] sm:max-h-[90vh] min-w-0 w-full ${maxWidth} bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl shadow-xl overflow-hidden`}
        style={{ boxShadow: "var(--shadow-xl)" }}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-[var(--neutral-border)]">
          <h2 className="text-base font-semibold text-[var(--text-primary)] truncate pr-2">{title}</h2>
          <button
            onClick={onClose}
            className="flex shrink-0 items-center justify-center w-8 h-8 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Tutup modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4">{children}</div>
      </div>
    </div>
  );
}
