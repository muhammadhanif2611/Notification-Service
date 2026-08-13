/**
 * ClusterHealthCard — Menampilkan status kesehatan satu cluster/service.
 * @param {object} props
 * @param {string} props.name - Nama cluster (e.g. "Main Gateway")
 * @param {"healthy"|"degraded"|"down"} props.status - Status cluster
 * @param {string} [props.latency] - Latensi (e.g. "12ms")
 * @param {string} [props.uptime] - Uptime (e.g. "99.98%")
 * @param {string} [props.detail] - Detail tambahan
 * @returns {JSX.Element}
 */
export default function ClusterHealthCard({ name, status = "healthy", latency, uptime, detail }) {
  const statusMap = {
    healthy:  { dot: "bg-emerald-500", label: "Healthy",  bg: "bg-emerald-500/10" },
    degraded: { dot: "bg-amber-500",   label: "Degraded", bg: "bg-amber-500/10" },
    down:     { dot: "bg-red-500",     label: "Down",     bg: "bg-red-500/10" },
  };

  const config = statusMap[status] || statusMap.healthy;

  return (
    <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--text-primary)]">{name}</span>
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium ${config.bg}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
          {config.label}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {latency && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Latency</span>
            <p className="text-sm font-mono font-medium text-[var(--text-primary)]">{latency}</p>
          </div>
        )}
        {uptime && (
          <div>
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Uptime</span>
            <p className="text-sm font-mono font-medium text-[var(--text-primary)]">{uptime}</p>
          </div>
        )}
      </div>
      {detail && (
        <span className="text-xs text-[var(--text-muted)]">{detail}</span>
      )}
    </div>
  );
}
