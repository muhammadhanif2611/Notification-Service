// =============================================================================
// Shared Component: StatusBadge (Frontend)
// Menggunakan token warna DESIGN.md melalui CSS variables (dark mode compatible).
// =============================================================================

import { STATUS_CONFIG } from "@/constants/statusConfig";

/**
 * StatusBadge — Menampilkan label status dengan warna sesuai DESIGN.md token.
 * @param {object} props
 * @param {string} props.status - Status value (e.g. "DELIVERED", "QUEUED", "FAILED")
 * @returns {JSX.Element}
 */
export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status?.toUpperCase()] || {
    label: status,
    className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
