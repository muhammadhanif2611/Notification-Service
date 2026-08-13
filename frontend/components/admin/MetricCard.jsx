/**
 * MetricCard — Kartu metrik reusable untuk dashboard admin.
 * Angka value menggunakan font mono (JetBrains Mono) + tabular-nums sesuai DESIGN.md.
 * @param {object} props
 * @param {React.ReactNode} props.icon - Lucide icon element
 * @param {string} props.label - Label metrik (e.g. "Total Terkirim")
 * @param {string|number} props.value - Nilai metrik (e.g. "18.420")
 * @param {string} [props.subtitle] - Teks tambahan (e.g. "24 jam terakhir")
 * @param {string} [props.trend] - Teks tren (e.g. "+12.5%")
 * @param {"up"|"down"|"neutral"} [props.trendDirection] - Arah tren
 * @returns {JSX.Element}
 */
export default function MetricCard({ icon, label, value, subtitle, trend, trendDirection = "neutral" }) {
  const trendColor = {
    up: "text-emerald-600 dark:text-emerald-400",
    down: "text-red-600 dark:text-red-400",
    neutral: "text-[var(--text-muted)]",
  };

  return (
    <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[var(--text-secondary)] text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
        {icon && (
          <span className="text-[var(--text-muted)]">{icon}</span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <span className="text-2xl font-semibold font-mono text-[var(--text-primary)]">
          {value}
        </span>
        {trend && (
          <span className={`text-xs font-medium font-mono ${trendColor[trendDirection]}`}>
            {trend}
          </span>
        )}
      </div>
      {subtitle && (
        <span className="text-xs text-[var(--text-muted)]">{subtitle}</span>
      )}
    </div>
  );
}
