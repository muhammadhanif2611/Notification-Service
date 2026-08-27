/**
 * DataTable — Tabel data reusable dengan header, rows, dan empty state.
 * @param {object} props
 * @param {Array<{key: string, label: string, mono?: boolean, className?: string}>} props.columns - Definisi kolom
 * @param {Array<object>} props.data - Data rows
 * @param {function} [props.onRowClick] - Handler klik baris
 * @param {string} [props.emptyTitle] - Judul empty state
 * @param {string} [props.emptyDescription] - Deskripsi empty state
 * @param {React.ReactNode} [props.actions] - Action buttons di header
 * @returns {JSX.Element}
 */
export default function DataTable({ columns, data = [], onRowClick, emptyTitle, emptyDescription, actions }) {
  return (
    <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl overflow-hidden">
      {actions && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--neutral-border)]">
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {data.length} items
          </span>
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--neutral-border)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left px-4 py-3 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)] ${col.className || ""}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center">
                  <p className="text-sm font-medium text-[var(--text-secondary)]">
                    {emptyTitle || "Tidak ada data"}
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {emptyDescription || "Data akan muncul setelah tersedia."}
                  </p>
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={row.id || i}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-[var(--neutral-border)] last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${
                    onRowClick ? "cursor-pointer" : ""
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-[var(--text-primary)] ${
                        col.mono ? "font-mono" : ""
                      } ${col.className || ""}`}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
