"use client";

import { useState } from "react";
import { AlertTriangle, Bell, BellOff, Settings, Clock } from "lucide-react";

/**
 * Threshold Alert Page — Sistem peringatan ambang batas.
 * DESIGN.md 6B.7: Failure rate, kuota vendor habis, queue overload. Toggle enable/disable, threshold editor.
 */

const MOCK_RULES = [
  {
    id: "1",
    name: "High Failure Rate",
    description: "Alert ketika failure rate melebihi threshold dalam 5 menit terakhir",
    metric: "failure_rate",
    operator: ">",
    threshold: 5,
    unit: "%",
    window: "5 menit",
    enabled: true,
    lastTriggered: "2026-08-12T14:30:00Z",
    triggerCount: 3,
  },
  {
    id: "2",
    name: "Vendor Quota Exhausted",
    description: "Alert ketika kuota harian vendor mencapai 95% kapasitas",
    metric: "vendor_quota_usage",
    operator: ">=",
    threshold: 95,
    unit: "%",
    window: "1 hari",
    enabled: true,
    lastTriggered: "2026-08-11T23:45:00Z",
    triggerCount: 1,
  },
  {
    id: "3",
    name: "Queue Overload",
    description: "Alert ketika antrean tertunda melebihi batas pesan",
    metric: "queue_pending",
    operator: ">",
    threshold: 5000,
    unit: "pesan",
    window: "Real-time",
    enabled: true,
    lastTriggered: null,
    triggerCount: 0,
  },
  {
    id: "4",
    name: "High Latency",
    description: "Alert ketika rata-rata latency dispatch melebihi threshold",
    metric: "avg_latency",
    operator: ">",
    threshold: 500,
    unit: "ms",
    window: "10 menit",
    enabled: false,
    lastTriggered: null,
    triggerCount: 0,
  },
  {
    id: "5",
    name: "Worker Down",
    description: "Alert ketika worker thread berhenti merespons",
    metric: "worker_health",
    operator: "==",
    threshold: 0,
    unit: "active",
    window: "Real-time",
    enabled: true,
    lastTriggered: null,
    triggerCount: 0,
  },
];

const MOCK_HISTORY = [
  { id: "1", rule: "High Failure Rate", value: "8.2%", threshold: "5%", time: "2026-08-12T14:30:00Z", resolved: true },
  { id: "2", rule: "High Failure Rate", value: "6.1%", threshold: "5%", time: "2026-08-12T10:15:00Z", resolved: true },
  { id: "3", rule: "Vendor Quota Exhausted", value: "97%", threshold: "95%", time: "2026-08-11T23:45:00Z", resolved: true },
  { id: "4", rule: "High Failure Rate", value: "5.5%", threshold: "5%", time: "2026-08-10T09:30:00Z", resolved: true },
];

export default function ThresholdAlertPage() {
  const [rules, setRules] = useState(MOCK_RULES);

  const toggleRule = (id) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Threshold Alerts</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Aturan alert otomatis untuk memantau anomali sistem.
        </p>
      </div>

      {/* Alert Rules */}
      <div className="space-y-3">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className={`bg-[var(--neutral-surface)] border rounded-xl p-4 transition-colors ${
              rule.enabled ? "border-[var(--neutral-border)]" : "border-[var(--neutral-border)] opacity-60"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`flex items-center justify-center w-9 h-9 rounded-lg shrink-0 ${
                  rule.enabled ? "bg-amber-500/10" : "bg-zinc-100 dark:bg-zinc-800"
                }`}>
                  <AlertTriangle size={16} className={rule.enabled ? "text-amber-600 dark:text-amber-400" : "text-[var(--text-muted)]"} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[var(--text-primary)]">{rule.name}</h3>
                    {rule.triggerCount > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-500/10 text-red-700 dark:text-red-400">
                        {rule.triggerCount}x triggered
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">{rule.description}</p>

                  {/* Threshold Display */}
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-[var(--neutral-border)]">
                      <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">Threshold</span>
                      <span className="text-sm font-mono font-semibold text-[var(--text-primary)]">
                        {rule.operator} {rule.threshold}{rule.unit}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                      <Clock size={12} />
                      <span>Window: {rule.window}</span>
                    </div>
                    {rule.lastTriggered && (
                      <div className="text-xs text-[var(--text-muted)]">
                        Last: <span className="font-mono">{new Date(rule.lastTriggered).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Toggle */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`relative w-10 h-6 rounded-full transition-colors ${
                    rule.enabled ? "bg-emerald-500" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                  aria-label={rule.enabled ? "Disable rule" : "Enable rule"}
                >
                  <span
                    className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      rule.enabled ? "left-[18px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Alert History */}
      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--neutral-border)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Alert History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--neutral-border)]">
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Rule</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Actual Value</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Threshold</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Time</th>
                <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_HISTORY.map((h) => (
                <tr key={h.id} className="border-b border-[var(--neutral-border)] last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{h.rule}</td>
                  <td className="px-4 py-2.5 font-mono text-red-600 dark:text-red-400">{h.value}</td>
                  <td className="px-4 py-2.5 font-mono text-[var(--text-muted)]">{h.threshold}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-muted)]">
                    {new Date(h.time).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      Resolved
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
