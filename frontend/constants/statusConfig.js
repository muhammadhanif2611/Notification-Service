/**
 * @fileoverview Frontend Status Badge Configurations
 */

export const STATUS_CONFIG = Object.freeze({
  PENDING:    { label: "Pending",    className: "bg-yellow-100 text-yellow-800" },
  QUEUED:     { label: "Queued",     className: "bg-blue-100 text-blue-800" },
  SENT:       { label: "Sent",       className: "bg-green-100 text-green-800" },
  DELIVERED:  { label: "Delivered",  className: "bg-green-200 text-green-900" },
  READ:       { label: "Read",       className: "bg-emerald-100 text-emerald-800" },
  FAILED:     { label: "Failed",     className: "bg-red-100 text-red-800" },
  REJECTED:   { label: "Rejected",   className: "bg-orange-100 text-orange-800" },
  SUPPRESSED: { label: "Suppressed", className: "bg-gray-100 text-gray-800" },
  ACTIVE:     { label: "Active",     className: "bg-green-100 text-green-800" },
  INACTIVE:   { label: "Inactive",   className: "bg-gray-100 text-gray-600" },
});
