"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Check, Send, Eye, EyeOff, RefreshCw, ShieldCheck, ArrowRight } from "lucide-react";
import { useProjectContext } from "@/lib/project-context";
import { apiGet, apiPut } from "@/lib/api";
import Alert from "@/components/shared/Alert";
import { ROUTES } from "@/constants/routes";

const EVENT_OPTIONS = [
  { id: "message.delivered", label: "message.delivered", desc: "Pesan berhasil terkirim" },
  { id: "message.failed", label: "message.failed", desc: "Pesan gagal terkirim" },
];

// Halaman konfigurasi Webhook Client untuk mengatur URL callback, HMAC secret, dan pengujian ping via backend.
export default function WebhookPage() {
  const { activeProject, loading: projectLoading, refetch } = useProjectContext();
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("whsec_9f8e7d6c5b4a3210");
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [events, setEvents] = useState(["message.delivered", "message.failed"]);
  const [pingResult, setPingResult] = useState(null);
  const [pinging, setPinging] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const projectId = activeProject?.id;
  const [syncedProjectId, setSyncedProjectId] = useState(null);
  if (projectId && projectId !== syncedProjectId) {
    setSyncedProjectId(projectId);
    setUrl(activeProject.webhook_url || "");
    setSecret(activeProject.webhook_secret || "");
    const validIds = new Set(EVENT_OPTIONS.map((ev) => ev.id));
    const currentEvents = Array.isArray(activeProject.webhook_events)
      ? activeProject.webhook_events.filter((ev) => validIds.has(ev))
      : [];
    setEvents(currentEvents.length > 0 ? currentEvents : ["message.delivered", "message.failed"]);
  }

  const loading = projectLoading || (!!projectId && projectId !== syncedProjectId);

  const toggleEvent = (id) =>
    setEvents((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!activeProject?.id) {
      setError("Pilih project terlebih dahulu.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiPut(`/v1/clients/projects/${activeProject.id}`, {
        webhook_url: url || null,
        webhook_secret: secret || null,
        webhook_events: events,
      });
      await refetch();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateSecret = () => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    setSecret("whsec_" + btoa(String.fromCharCode(...bytes)));
  };

  const handlePing = async () => {
    if (!url || !activeProject?.id) return;
    setPinging(true);
    setPingResult(null);
    setError(null);
    try {
      if (url !== (activeProject.webhook_url || "") || secret !== (activeProject.webhook_secret || "")) {
        await apiPut(`/v1/clients/projects/${activeProject.id}`, {
          webhook_url: url || null,
          webhook_secret: secret || null,
          webhook_events: events,
        });
        await refetch();
      }
      const res = await apiGet(`/v1/clients/projects/${activeProject.id}/webhook-health`, { skipDedupe: true });
      const data = res?.data || {};
      setPingResult({
        status: data.http_status ?? 0,
        latency: data.latency_ms ?? 0,
        body: data.body || (data.reachable ? "OK" : "Endpoint tidak merespons"),
      });
    } catch (err) {
      setPingResult({ status: 0, latency: 0, body: err.message });
    } finally {
      setPinging(false);
    }
  };

  if (loading) return <div className="text-sm text-[var(--text-muted)]">Memuat konfigurasi webhook...</div>;
  if (!activeProject) {
    return (
      <Alert variant="warning" title="Project belum dipilih">
        Silakan pilih project di menu Projects terlebih dahulu.
      </Alert>
    );
  }

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Webhook Config</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Terima notifikasi status pengiriman secara real-time ke endpoint Anda.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5 space-y-5">
        {error && <Alert variant="error">{error}</Alert>}
        {saved && <Alert variant="success">Konfigurasi webhook berhasil disimpan!</Alert>}

        <div>
          <label htmlFor="webhook-url" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Endpoint URL
          </label>
          <input
            id="webhook-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.yourcompany.com/v1/notifications/callback"
            className="w-full px-3 py-2.5 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
            Endpoint harus merespons HTTP 200 dalam 5 detik, jika tidak akan di-retry.
          </p>
        </div>

        <div>
          <label htmlFor="webhook-secret" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Secret Signing Key (HMAC SHA-256)
          </label>
          <div className="relative">
            <input
              id="webhook-secret"
              type={showSecret ? "text" : "password"}
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full px-3 py-2.5 pr-24 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)] focus:outline-none"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button
                type="button"
                onClick={handleGenerateSecret}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Generate secret baru"
                title="Generate secret baru (whsec_)"
              >
                <RefreshCw size={14} />
              </button>
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Toggle secret"
              >
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                type="button"
                onClick={handleCopySecret}
                className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                aria-label="Salin secret"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
            Simpan secret ini di env project Anda (<code className="font-mono">NGW_WEBHOOK_SECRET</code>).
            Gateway mengirim header <code className="font-mono">webhook-id</code>, <code className="font-mono">webhook-timestamp</code>, dan <code className="font-mono">webhook-signature</code> — verifikasi dengan <code className="font-mono">client.webhooks.verify()</code>.
          </p>
        </div>

        <div>
          <span className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Event Trigger</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EVENT_OPTIONS.map((ev) => (
              <label
                key={ev.id}
                className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                  events.includes(ev.id) ? "border-[var(--primary)] bg-zinc-50 dark:bg-zinc-800/50" : "border-[var(--neutral-border)]"
                }`}
              >
                <input type="checkbox" checked={events.includes(ev.id)} onChange={() => toggleEvent(ev.id)} className="mt-0.5" />
                <div>
                  <p className="text-xs font-mono font-medium text-[var(--text-primary)]">{ev.label}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{ev.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[var(--neutral-border)]">
          <button
            type="button"
            onClick={handlePing}
            disabled={pinging || !url}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-zinc-50 dark:hover:bg-zinc-800/50 disabled:opacity-50 transition-colors"
          >
            {pinging ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            {pinging ? "Mengirim..." : "Test Ping"}
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
          >
            {saving ? "Menyimpan..." : saved ? "Tersimpan ✓" : "Simpan Konfigurasi"}
          </button>
        </div>
      </form>

      {pingResult && (
        <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Hasil Test Ping</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold font-mono ${
                  pingResult.status >= 200 && pingResult.status < 300
                    ? "bg-[var(--status-delivered-bg)] text-[var(--status-delivered-text)]"
                    : "bg-[var(--status-failed-bg)] text-[var(--status-failed-text)]"
                }`}
              >
                {pingResult.status} {pingResult.status >= 200 && pingResult.status < 300 ? "OK" : "ERROR"}
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)]">{pingResult.latency}ms</span>
            </div>
            <pre className="text-[11px] font-mono bg-zinc-950 text-emerald-400 rounded-lg p-3 overflow-x-auto">
              {pingResult.body}
            </pre>
          </div>
        </div>
      )}

      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cara Kerja &amp; Verifikasi Signature</h3>
        </div>

        <ol className="list-decimal list-inside space-y-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
          <li>Buat endpoint <code className="font-mono">POST</code> di project Anda, lalu simpan URL-nya di form atas beserta Signing Secret.</li>
          <li>Setiap status pesan berubah (SENT/FAILED), gateway mengirim HTTP POST ke endpoint Anda dengan format event <code className="font-mono">{"{ type, created_at, data }"}</code>.</li>
          <li>Setiap request menyertakan header <code className="font-mono">webhook-id</code>, <code className="font-mono">webhook-timestamp</code>, dan <code className="font-mono">webhook-signature</code> (HMAC-SHA256).</li>
          <li>Verifikasi signature menggunakan HMAC-SHA256 sesuai contoh kode multi-bahasa agar request palsu &amp; replay attack tertolak otomatis.</li>
          <li>Balas HTTP 200 dalam 5 detik. Jika gagal, gateway melakukan retry hingga 3x dengan exponential backoff.</li>
        </ol>

        <div className="pt-2">
          <Link
            href={ROUTES.CLIENT.DOCS}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--primary)] hover:underline"
          >
            Lihat contoh kode verifikasi Webhook di halaman Dokumentasi <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </>
  );
}
