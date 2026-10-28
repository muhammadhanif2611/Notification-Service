"use client";

import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, BellOff, RefreshCw, Plus, Trash2 } from "lucide-react";
import { apiGet, apiPut, apiPost, apiDelete } from "@/lib/api";
import { useToast } from "@/lib/toast-context";

/** Threshold Alert Page — Aturan alert otomatis, tersimpan di database dan dievaluasi backend. */

const EMPTY_RULE = {
  name: "",
  description: "",
  metric: "failure_rate",
  operator: ">",
  threshold: 5,
  unit: "%",
  window_minutes: 5,
};

export default function ThresholdAlertPage() {
  const toast = useToast();
  const [rules, setRules] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_RULE);
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [rulesRes, historyRes] = await Promise.allSettled([
      apiGet("/v1/alert-rules"),
      apiGet("/v1/alert-history"),
    ]);
    if (rulesRes.status === "fulfilled") setRules(rulesRes.value?.data || []);
    if (historyRes.status === "fulfilled") setHistory(historyRes.value?.data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => { if (!cancelled) await fetchData(); })();
    return () => { cancelled = true; };
  }, [fetchData]);

  const toggleRule = async (rule) => {
    const nextEnabled = !rule.enabled;
    setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: nextEnabled } : r)));
    try {
      await apiPut(`/v1/alert-rules/${rule.id}`, { enabled: nextEnabled });
    } catch {
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: rule.enabled } : r)));
    }
  };

  const handleCreateRule = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const res = await apiPost("/v1/alert-rules", {
        ...form,
        threshold: Number(form.threshold),
        window_minutes: Number(form.window_minutes),
      });
      if (res?.data) setRules((prev) => [...prev, res.data]);
      setForm(EMPTY_RULE);
      setShowForm(false);
      toast.success("Rule alert berhasil ditambahkan.");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRule = async (rule) => {
    try {
      await apiDelete(`/v1/alert-rules/${rule.id}`);
      setRules((prev) => prev.filter((r) => r.id !== rule.id));
      toast.success(`Rule "${rule.name}" dihapus.`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resolveEntry = async (entry) => {
    setHistory((prev) => prev.map((h) => (h.id === entry.id ? { ...h, resolved: true } : h)));
    try {
      await apiPost(`/v1/alert-history/${entry.id}/resolve`);
    } catch {
      setHistory((prev) => prev.map((h) => (h.id === entry.id ? { ...h, resolved: false } : h)));
    }
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Threshold Alerts</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Aturan alert otomatis untuk memantau anomali sistem.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Plus size={14} />
            Tambah Rule
          </button>
          <button
            onClick={() => fetchData()}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreateRule} className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Nama Rule</label>
            <input
              type="text"
              required
              placeholder="High Failure Rate"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Metric</label>
            <select
              value={form.metric}
              onChange={(e) => {
                const metric = e.target.value;
                const unit = metric === "avg_latency" ? "ms" : metric === "queue_pending" ? "pesan" : "%";
                setForm((f) => ({ ...f, metric, unit }));
              }}
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]"
            >
              <option value="failure_rate">Failure Rate (%)</option>
              <option value="queue_pending">Queue Pending (pesan)</option>
              <option value="avg_latency">Avg Latency (ms)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Threshold</label>
            <div className="flex gap-1.5">
              <select
                value={form.operator}
                onChange={(e) => setForm((f) => ({ ...f, operator: e.target.value }))}
                className="px-2 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]"
              >
                <option value=">">&gt;</option>
                <option value=">=">&gt;=</option>
                <option value="<">&lt;</option>
                <option value="==">==</option>
              </select>
              <input
                type="number"
                required
                value={form.threshold}
                onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Window (menit)</label>
            <input
              type="number"
              min={1}
              required
              value={form.window_minutes}
              onChange={(e) => setForm((f) => ({ ...f, window_minutes: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
          >
            {saving ? "Menyimpan..." : "Simpan Rule"}
          </button>
        </form>
      )}

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
                    {rule.triggered && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-500/10 text-red-700 dark:text-red-400 animate-pulse">
                        TRIGGERED {rule.current_value}{rule.unit}
                      </span>
                    )}
                    {!rule.triggered && rule.trigger_count > 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-red-500/10 text-red-700 dark:text-red-400">
                        {rule.trigger_count}x triggered
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
                      <span>Window: {rule.window_minutes} menit</span>
                    </div>
                    {rule.last_triggered_at && (
                      <div className="text-xs text-[var(--text-muted)]">
                        Last: <span className="font-mono">{new Date(rule.last_triggered_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Toggle & Delete */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => toggleRule(rule)}
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
                <button
                  type="button"
                  onClick={() => handleDeleteRule(rule)}
                  className="p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--text-muted)] hover:text-red-600 transition-colors"
                  title="Hapus rule"
                >
                  <Trash2 size={14} />
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
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">
                    Belum ada alert yang ter-trigger.
                  </td>
                </tr>
              ) : history.map((h) => (
                <tr key={h.id} className="border-b border-[var(--neutral-border)] last:border-b-0 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-[var(--text-primary)]">{h.rule_name}</td>
                  <td className="px-4 py-2.5 font-mono text-red-600 dark:text-red-400">{h.metric_value}{h.unit}</td>
                  <td className="px-4 py-2.5 font-mono text-[var(--text-muted)]">{h.threshold}{h.unit}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-[var(--text-muted)]">
                    {new Date(h.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="px-4 py-2.5">
                    {h.resolved ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                        Resolved
                      </span>
                    ) : (
                      <button
                        onClick={() => resolveEntry(h)}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-500/10 text-red-700 dark:text-red-400 hover:bg-red-500/20 transition-colors"
                      >
                        <BellOff size={11} /> Mark Resolved
                      </button>
                    )}
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
