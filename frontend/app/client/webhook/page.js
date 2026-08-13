"use client";

import { useState } from "react";
import { Webhook, Copy, Check, Send, Eye, EyeOff, RefreshCw } from "lucide-react";

const EVENT_OPTIONS = [
  { id: "message.delivered", label: "message.delivered", desc: "Pesan berhasil terkirim" },
  { id: "message.failed", label: "message.failed", desc: "Pesan gagal terkirim" },
  { id: "message.queued", label: "message.queued", desc: "Pesan masuk antrean" },
  { id: "message.read", label: "message.read", desc: "Pesan dibaca penerima" },
];

/** WebhookPage â€” Konfigurasi webhook (DESIGN.md 6A.5): URL, HMAC secret, event trigger, test ping. */
export default function WebhookPage() {
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("whsec_9f8e7d6c5b4a3210");
  const [showSecret, setShowSecret] = useState(false);
  const [copied, setCopied] = useState(false);
  const [events, setEvents] = useState(["message.delivered", "message.failed"]);
  const [pingResult, setPingResult] = useState(null);
  const [pinging, setPinging] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggleEvent = (id) =>
    setEvents((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handlePing = async () => {
    setPinging(true);
    setPingResult(null);
    // Simulasi test ping webhook
    await new Promise((r) => setTimeout(r, 900));
    setPingResult({ status: 200, latency: 184, body: "{ \"received\": true }" });
    setPinging(false);
  };

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Webhook Config</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Terima notifikasi status pengiriman secara real-time ke endpoint Anda.
        </p>
      </div>

      <form onSubmit={handleSave} className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5 space-y-5">
        {/* Endpoint URL */}
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

        {/* Signing Secret */}
        <div>
          <label htmlFor="webhook-secret" className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
            Secret Signing Key (HMAC SHA-256)
          </label>
          <div className="relative">
            <input
              id="webhook-secret"
              type={showSecret ? "text" : "password"}
              readOnly
              value={secret}
              className="w-full px-3 py-2.5 pr-20 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)] focus:outline-none"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button type="button" onClick={() => setShowSecret(!showSecret)} className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" aria-label="Toggle secret">
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button type="button" onClick={handleCopySecret} className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" aria-label="Salin secret">
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
            Verifikasi header <code className="font-mono">X-Gateway-Signature</code> dengan key ini.
          </p>
        </div>

        {/* Event Triggers */}
        <div>
          <span className="block text-xs font-medium text-[var(--text-secondary)] mb-2">Event Trigger</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {EVENT_OPTIONS.map((ev) => (
              <label key={ev.id} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                events.includes(ev.id) ? "border-[var(--primary)] bg-zinc-50 dark:bg-zinc-800/50" : "border-[var(--neutral-border)]"
              }`}>
                <input type="checkbox" checked={events.includes(ev.id)} onChange={() => toggleEvent(ev.id)} className="mt-0.5" />
                <div>
                  <p className="text-xs font-mono font-medium text-[var(--text-primary)]">{ev.label}</p>
                  <p className="text-[11px] text-[var(--text-muted)]">{ev.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[var(--neutral-border)]">
          <button type="button" onClick={handlePing} disabled={pinging || !url}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-zinc-50 dark:hover:bg-zinc-800/50 disabled:opacity-50 transition-colors">
            {pinging ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
            {pinging ? "Mengirim..." : "Test Ping"}
          </button>
          <button type="submit" className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-medium hover:bg-[var(--primary-hover)] transition-colors">
            {saved ? "Tersimpan âœ“" : "Simpan Konfigurasi"}
          </button>
        </div>
      </form>

      {/* Ping Result */}
      {pingResult && (
        <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Hasil Test Ping</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold font-mono ${
                pingResult.status === 200
                  ? "bg-[var(--status-delivered-bg)] text-[var(--status-delivered-text)]"
                  : "bg-[var(--status-failed-bg)] text-[var(--status-failed-text)]"
              }`}>
                {pingResult.status} {pingResult.status === 200 ? "OK" : "ERROR"}
              </span>
              <span className="text-xs font-mono text-[var(--text-muted)]">{pingResult.latency}ms</span>
            </div>
            <pre className="text-[11px] font-mono bg-zinc-950 text-emerald-400 rounded-lg p-3 overflow-x-auto">
              {pingResult.body}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}
