/**
 * @fileoverview Frontend Status Badge Configurations
 * Warna sesuai DESIGN.md token: Emerald (success), Amber (pending), Red (error)
 */

export const STATUS_CONFIG = Object.freeze({
  PENDING:    { label: "Pending",    className: "bg-[var(--status-queued-bg)] text-[var(--status-queued-text)]" },
  QUEUED:     { label: "Queued",     className: "bg-[var(--status-queued-bg)] text-[var(--status-queued-text)]" },
  PROCESSING: { label: "Processing", className: "bg-[var(--status-queued-bg)] text-[var(--status-queued-text)]" },
  SENT:       { label: "Sent",       className: "bg-[var(--status-delivered-bg)] text-[var(--status-delivered-text)]" },
  DELIVERED:  { label: "Delivered",  className: "bg-[var(--status-delivered-bg)] text-[var(--status-delivered-text)]" },
  READ:       { label: "Read",       className: "bg-[var(--status-delivered-bg)] text-[var(--status-delivered-text)]" },
  FAILED:     { label: "Failed",     className: "bg-[var(--status-failed-bg)] text-[var(--status-failed-text)]" },
  REJECTED:   { label: "Rejected",   className: "bg-[var(--status-failed-bg)] text-[var(--status-failed-text)]" },
  SUPPRESSED: { label: "Suppressed", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  ACTIVE:     { label: "Active",     className: "bg-[var(--status-delivered-bg)] text-[var(--status-delivered-text)]" },
  INACTIVE:   { label: "Inactive",   className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  APPROVED:   { label: "Approved",   className: "bg-[var(--status-delivered-bg)] text-[var(--status-delivered-text)]" },
});
