"use client";

import { useState, useEffect } from "react";
import { Webhook, Copy, Check, Send, Eye, EyeOff, RefreshCw, ShieldCheck } from "lucide-react";
import { useProjectContext } from "@/lib/project-context";
import { apiGet, apiPut } from "@/lib/api";
import Alert from "@/components/shared/Alert";

// Snippet integrasi webhook siap copy-paste untuk project lain (pola Resend)
const EXPRESS_SNIPPET = `// Endpoint webhook — Express.js
import { NotificationClient } from '@notification-gateway/sdk';

const client = new NotificationClient({ apiKey: process.env.NGW_API_KEY });

// PENTING: pakai express.raw agar body tetap string mentah
app.post('/webhook/notification',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    try {
      const event = client.webhooks.verify({
        payload: req.body.toString(), // raw body
        headers: {
          id: req.headers['webhook-id'],
          timestamp: req.headers['webhook-timestamp'],
          signature: req.headers['webhook-signature'],
        },
        secret: process.env.NGW_WEBHOOK_SECRET, // whsec_...
      });
      console.log(event.type, event.data.messageId, event.data.status);
      res.json({ received: true });
    } catch {
      res.status(400).json({ error: 'Invalid webhook' });
    }
  }
);`;

const NEXTJS_SNIPPET = `// app/api/webhook/route.ts — Next.js App Router
import { NotificationClient } from '@notification-gateway/sdk';

const client = new NotificationClient({ apiKey: process.env.NGW_API_KEY });

export async function POST(req: Request) {
  const payload = await req.text(); // raw body WAJIB via .text()
  try {
    const event = client.webhooks.verify({
      payload,
      headers: {
        id: req.headers.get('webhook-id'),
        timestamp: req.headers.get('webhook-timestamp'),
        signature: req.headers.get('webhook-signature'),
      },
      secret: process.env.NGW_WEBHOOK_SECRET!,
    });
    console.log(event.type, event.data.messageId, event.data.status);
    return Response.json({ received: true });
  } catch {
    return Response.json({ error: 'Invalid webhook' }, { status: 400 });
  }
}`;

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
      {copied ? <><Check size={12} className="text-emerald-500" /> Copied!</> : <><Copy size={12} /> Copy</>}
    </button>
  );
}

const EVENT_OPTIONS = [
  { id: "message.delivered", label: "message.delivered", desc: "Pesan berhasil terkirim" },
  { id: "message.failed", label: "message.failed", desc: "Pesan gagal terkirim" },
  { id: "message.queued", label: "message.queued", desc: "Pesan masuk antrean" },
  { id: "message.read", label: "message.read", desc: "Pesan dibaca penerima" },
];

/** WebhookPage â€” Konfigurasi webhook (DESIGN.md 6A.5): URL, HMAC secret, event trigger, test ping. */
export default function WebhookPage() {
  const { activeProject, loading: projectLoading } = useProjectContext();
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

  // Sinkronisasi form dari project aktif SAAT RENDER (pola resmi React:
  // "adjusting state during rendering") — bukan setState di dalam effect.
  // Reset juga terjadi otomatis saat ganti project (projectId berubah).
  const projectId = activeProject?.id;
  const [syncedProjectId, setSyncedProjectId] = useState(null);
  if (projectId && projectId !== syncedProjectId) {
    setSyncedProjectId(projectId);
    setUrl(activeProject.webhook_url || "");
    setSecret(activeProject.webhook_secret || "");
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
    if (!activeProject?.id) { setError("Pilih project terlebih dahulu."); return; }
    setSaving(true); setError(null);
    try {
      await apiPut("/v1/clients/projects/" + activeProject.id, { webhook_url: url || null, webhook_secret: secret || null });
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (err) { setError(err.message); } finally { setSaving(false); }
  };

  // Generate secret baru (whsec_ + base64 24 byte) — ala Resend
  const handleGenerateSecret = () => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    setSecret("whsec_" + btoa(String.fromCharCode(...bytes)));
  };

  const handlePing = async () => {
    if (!url) return;
    setPinging(true); setPingResult(null);
    const startTime = Date.now();
    try {
      const testPayload = {
        type: "notification.status_update",
        created_at: new Date().toISOString(),
        data: { messageId: "msg_test_" + Date.now(), status: "SENT", error: null, _test: true }
      };
      const body = JSON.stringify(testPayload);
      const webhookId = "msg_test_" + crypto.randomUUID().replaceAll("-", "");
      const webhookTimestamp = Math.floor(Date.now() / 1000).toString();
      let signature = "";
      let legacySignature = "";
      if (secret) {
        const encoder = new TextEncoder();
        // Signature ala Svix: HMAC(`${id}.${timestamp}.${rawBody}`) base64, prefix "v1,"
        let keyBytes = encoder.encode(secret);
        if (secret.startsWith("whsec_")) {
          keyBytes = Uint8Array.from(atob(secret.slice("whsec_".length)), (c) => c.charCodeAt(0));
        }
        const key = await crypto.subtle.importKey("raw", keyBytes, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(`${webhookId}.${webhookTimestamp}.${body}`));
        signature = "v1," + btoa(String.fromCharCode(...new Uint8Array(sig)));
        // Signature legacy (hex dari body) untuk kompatibilitas integrasi lama
        const legacyKey = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const legacySig = await crypto.subtle.sign("HMAC", legacyKey, encoder.encode(body));
        legacySignature = Array.from(new Uint8Array(legacySig)).map(b => b.toString(16).padStart(2, "0")).join("");
      }
      const headers = { "Content-Type": "application/json" };
      if (signature) {
        headers["webhook-id"] = webhookId;
        headers["webhook-timestamp"] = webhookTimestamp;
        headers["webhook-signature"] = signature;
        headers["X-Gateway-Signature"] = legacySignature;
      }
      const response = await fetch(url, { method: "POST", headers, body, signal: AbortSignal.timeout(5000) });
      const latency = Date.now() - startTime;
      const responseBody = await response.text();
      setPingResult({ status: response.status, latency, body: responseBody.slice(0, 200) });
    } catch (err) { setPingResult({ status: 0, latency: Date.now() - startTime, body: err.message }); } finally { setPinging(false); }
  };

  if (loading) return <div className="text-sm text-[var(--text-muted)]">Memuat konfigurasi webhook...</div>;
  if (!activeProject) return <Alert variant="warning" title="Project belum dipilih">Silakan pilih project di menu Projects terlebih dahulu.</Alert>;

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
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full px-3 py-2.5 pr-24 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)] focus:outline-none"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button type="button" onClick={handleGenerateSecret} className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" aria-label="Generate secret baru" title="Generate secret baru (whsec_)">
                <RefreshCw size={14} />
              </button>
              <button type="button" onClick={() => setShowSecret(!showSecret)} className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" aria-label="Toggle secret">
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button type="button" onClick={handleCopySecret} className="p-1.5 rounded-md text-[var(--text-muted)] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" aria-label="Salin secret">
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
            Simpan secret ini di env project Anda (<code className="font-mono">NGW_WEBHOOK_SECRET</code>).
            Gateway mengirim header <code className="font-mono">webhook-id</code>, <code className="font-mono">webhook-timestamp</code>, dan <code className="font-mono">webhook-signature</code> — verifikasi dengan <code className="font-mono">client.webhooks.verify()</code>.
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

      {/* Cara Kerja Webhook — dokumentasi siap implement di project lain (pola Resend/Svix) */}
      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-amber-600 dark:text-amber-400" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Cara Kerja &amp; Integrasi di Project Anda</h3>
        </div>

        <ol className="list-decimal list-inside space-y-1.5 text-xs text-[var(--text-secondary)] leading-relaxed">
          <li>Buat endpoint <code className="font-mono">POST</code> di project Anda, lalu simpan URL-nya di form atas beserta Signing Secret.</li>
          <li>Setiap status pesan berubah (SENT/FAILED), gateway mengirim HTTP POST ke endpoint Anda dengan format event <code className="font-mono">{"{ type, created_at, data }"}</code>.</li>
          <li>Setiap request menyertakan header <code className="font-mono">webhook-id</code> (unik per event, bisa dipakai untuk idempotency), <code className="font-mono">webhook-timestamp</code>, dan <code className="font-mono">webhook-signature</code> (HMAC-SHA256).</li>
          <li>Verifikasi signature menggunakan SDK agar request palsu &amp; replay attack tertolak otomatis.</li>
          <li>Balas HTTP 200 dalam 10 detik. Jika gagal, gateway me-retry hingga 3x dengan exponential backoff (5s, 10s).</li>
        </ol>

        <div className="rounded-lg border border-[var(--neutral-border)] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border-b border-[var(--neutral-border)]">
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Express.js</span>
            <CopyButton text={EXPRESS_SNIPPET} />
          </div>
          <pre className="p-4 text-[11px] font-mono text-[var(--text-primary)] bg-[var(--neutral-bg)] overflow-x-auto leading-relaxed">{EXPRESS_SNIPPET}</pre>
        </div>

        <div className="rounded-lg border border-[var(--neutral-border)] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border-b border-[var(--neutral-border)]">
            <span className="text-[11px] font-medium text-[var(--text-secondary)]">Next.js (App Router)</span>
            <CopyButton text={NEXTJS_SNIPPET} />
          </div>
          <pre className="p-4 text-[11px] font-mono text-[var(--text-primary)] bg-[var(--neutral-bg)] overflow-x-auto leading-relaxed">{NEXTJS_SNIPPET}</pre>
        </div>

        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
          <strong>Penting:</strong> gunakan <em>raw request body</em> (string mentah) saat verifikasi.
          Signature sangat sensitif — framework yang me-parse JSON lalu me-stringify ulang akan membuat
          signature mismatch. Contoh payload:{" "}
          <code className="font-mono">{'{"type":"notification.status_update","created_at":"...","data":{"messageId":"...","status":"SENT","error":null}}'}</code>
        </p>
      </div>
    </>
  );
}
