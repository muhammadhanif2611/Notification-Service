import { Inbox } from "lucide-react";

/**
 * EmptyState — Tampilan informatif ketika tidak ada data (DESIGN.md: Jangan menampilkan placeholder kosong).
 * @param {object} props
 * @param {React.ReactNode} [props.icon] - Custom icon (default: Inbox)
 * @param {string} props.title - Judul empty state
 * @param {string} [props.description] - Deskripsi
 * @param {React.ReactNode} [props.action] - Action button
 * @returns {JSX.Element}
 */
export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 mb-4">
        {icon || <Inbox size={24} className="text-[var(--text-muted)]" />}
      </div>
      <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
      {description && (
        <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
