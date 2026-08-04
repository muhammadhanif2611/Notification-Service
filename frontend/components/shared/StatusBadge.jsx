// =============================================================================
// Shared Component: StatusBadge (Frontend)
// =============================================================================

import { STATUS_CONFIG } from "@/constants/statusConfig";

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status?.toUpperCase()] || {
    label: status,
    className: "bg-gray-100 text-gray-600",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
