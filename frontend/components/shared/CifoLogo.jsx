import Image from "next/image";

const ROLE_BADGE_STYLES = {
  admin: {
    label: "Admin",
    className: "bg-[var(--admin-badge-bg)] text-[var(--admin-badge-text)]",
  },
  client: {
    label: "Client",
    className: "bg-[var(--client-badge-bg)] text-[var(--client-badge-text)]",
  },
};

/**
 * CifoLogo — Menampilkan logo brand CIFO adaptif untuk Light dan Dark mode.
 *
 * @param {object} props
 * @param {string} [props.className] Kelas ukuran Tailwind tambahan
 * @param {boolean} [props.priority] Prioritas preload untuk halaman utama/login
 * @returns {JSX.Element}
 */
export default function CifoLogo({ className = "h-12 w-auto", priority = false }) {
  return (
    <>
      <Image
        src="/cifo-logo.png"
        alt="CIFO — your unlimited IT partner"
        width={348}
        height={159}
        priority={priority}
        unoptimized
        className={`block dark:hidden object-contain ${className}`}
      />
      <Image
        src="/cifo-logo-dark.png"
        alt="CIFO — your unlimited IT partner"
        width={348}
        height={159}
        priority={priority}
        unoptimized
        className={`hidden dark:block object-contain ${className}`}
      />
    </>
  );
}

/**
 * SidebarBrand — Header logo CIFO, nama aplikasi, dan badge role untuk sidebar.
 *
 * @param {object} props
 * @param {"admin" | "client"} props.role Role pengguna pada sidebar aktif
 * @returns {JSX.Element}
 */
export function SidebarBrand({ role }) {
  const badge = ROLE_BADGE_STYLES[role] || ROLE_BADGE_STYLES.client;

  return (
    <div className="px-5 py-4 border-b border-[var(--neutral-border)]">
      <CifoLogo className="h-12 w-auto" priority />
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-[var(--text-secondary)] truncate">
          Notification Gateway
        </p>
        <span
          className={`inline-flex items-center shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
    </div>
  );
}
