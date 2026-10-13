"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Code2, Copy, Check, Package, KeyRound, MessageSquare,
  Mail, Radio, ShieldCheck, AlertCircle, ExternalLink,
  Activity, RefreshCw, Clock,
} from "lucide-react";
import { useProjectContext } from "@/lib/project-context";
import { apiGet } from "@/lib/api";

// ─── CodeBlock ────────────────────────────────────────────────────────────────
function CodeBlock({ title, code }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="rounded-lg border border-[var(--neutral-border)] overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border-b border-[var(--neutral-border)]">
        <span className="text-[11px] font-medium text-[var(--text-secondary)]">{title}</span>
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          {copied ? <><Check size={12} className="text-emerald-500" /> Disalin!</> : <><Copy size={12} /> Salin</>}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-[var(--text-primary)] bg-[var(--neutral-bg)] overflow-x-auto leading-relaxed whitespace-pre">{code}</pre>
    </div>
  );
}

// ─── LangTabs ─────────────────────────────────────────────────────────────────
function LangTabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 w-fit flex-wrap">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
            active === tab.id
              ? "bg-[var(--neutral-surface)] text-[var(--text-primary)] shadow-sm"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── BadgeLink ────────────────────────────────────────────────────────────────
function BadgeLink({ href, label, color = "zinc" }) {
  const colors = {
    red: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50",
    orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 hover:bg-orange-200 dark:hover:bg-orange-900/50",
    zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700",
  };
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${colors[color]}`}
    >
      {label}
      <ExternalLink size={10} />
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SNIPPETS — per bahasa SDK
// ─────────────────────────────────────────────────────────────────────────────

const SDK_LANGS = [
  { id: "js",     label: "JavaScript (npm)" },
  { id: "python", label: "Python (pip)" },
  { id: "php",    label: "PHP (Composer)" },
];

const INSTALL_SNIPPETS = {
  js:     `npm install notification-gateway-sdk`,
  python: `pip install notification-gateway-sdk`,
  php:    `composer require notification-gateway/sdk`,
};

const INIT_SNIPPETS = {
  js: `import { NotificationClient } from 'notification-gateway-sdk';

const client = new NotificationClient({
  apiKey: process.env.NGW_API_KEY,   // ngw_prod_... atau ngw_sand_...
  baseUrl: 'http://localhost:3001',  // Ganti dengan production URL
  timeout: 10000,
});`,
  python: `from notification_gateway import NotificationClient
import os

client = NotificationClient(
    api_key=os.environ["NGW_API_KEY"],   # ngw_prod_... atau ngw_sand_...
    base_url="http://localhost:3001",    # Ganti dengan production URL
)`,
  php: `<?php

use NotificationGateway\\NotificationClient;

$client = new NotificationClient(
    apiKey: $_ENV['NGW_API_KEY'],     // ngw_prod_... atau ngw_sand_...
    baseUrl: 'http://localhost:3001', // Ganti dengan production URL
);`,
};

const WHATSAPP_SNIPPETS = {
  js: `// Teks biasa
await client.whatsapp.send({
  to: '6281234567890',
  body: 'Halo! Pesanan Anda #INV-10291 telah dikirim.',
});

// Dengan template
await client.whatsapp.send({
  to: '6281234567890',
  templateCode: 'otp_verification',
  variables: { nama: 'Budi', otp: '894211' },
});`,
  python: `# Teks biasa (sync)
result = client.whatsapp.send(
    to="6281234567890",
    body="Halo! Pesanan Anda #INV-10291 telah dikirim.",
)

# Dengan template + async (FastAPI)
result = await client.whatsapp.send_async(
    to="6281234567890",
    template_code="otp_verification",
    variables={"nama": "Budi", "otp": "894211"},
)`,
  php: `// Teks biasa
$result = $client->whatsapp->send(
    to: '6281234567890',
    body: 'Halo! Pesanan Anda #INV-10291 telah dikirim.',
);

// Dengan template
$result = $client->whatsapp->send(
    to: '6281234567890',
    templateCode: 'otp_verification',
    variables: ['nama' => 'Budi', 'otp' => '894211'],
);`,
};

const EMAIL_SNIPPETS = {
  js: `await client.email.send({
  to: 'budi@perusahaan.com',
  subject: 'Konfirmasi Pembayaran #INV-10291',
  body: '<h1>Terima kasih!</h1><p>Pembayaran Anda telah diterima.</p>',
});`,
  python: `# Sync (Flask)
result = client.email.send(
    to="budi@perusahaan.com",
    subject="Konfirmasi Pembayaran #INV-10291",
    body="<h1>Terima kasih!</h1><p>Pembayaran Anda telah diterima.</p>",
)

# Async (FastAPI)
result = await client.email.send_async(
    to="budi@perusahaan.com",
    subject="Konfirmasi Pembayaran #INV-10291",
    body="<h1>Terima kasih!</h1>",
)`,
  php: `$result = $client->email->send(
    to: 'budi@perusahaan.com',
    subject: 'Konfirmasi Pembayaran #INV-10291',
    body: '<h1>Terima kasih!</h1><p>Pembayaran Anda telah diterima.</p>',
);
echo $result['messageId']; // msg_...`,
};

const BROADCAST_SNIPPETS = {
  js: `const res = await client.broadcast.send({
  channel: 'WHATSAPP',
  recipients: ['6281234567890', '6281234567891'],
  templateCode: 'pengumuman_hrd',
  variables: { periode: 'Q3 2026' },
  recipientVariables: {
    '6281234567890': { nama: 'Biagi' },
    '6281234567891': { nama: 'Andi' },
  },
});
// res.broadcastId, res.totalQueued`,
  python: `# Sync (Flask)
result = client.broadcast.send(
    channel="WHATSAPP",
    recipients=["6281234567890", "6281234567891"],
    template_code="pengumuman_hrd",
    variables={"periode": "Q3 2026"},
    recipient_variables={
        "6281234567890": {"nama": "Biagi"},
        "6281234567891": {"nama": "Andi"},
    },
)

# Async (FastAPI)
result = await client.broadcast.send_async(
    channel="WHATSAPP",
    recipients=["6281234567890", "6281234567891"],
    template_code="pengumuman_hrd",
    variables={"periode": "Q3 2026"},
)`,
  php: `$result = $client->broadcast->send(
    channel: 'WHATSAPP',
    recipients: ['6281234567890', '6281234567891'],
    templateCode: 'pengumuman_hrd',
    variables: ['periode' => 'Q3 2026'],
    recipientVariables: [
        '6281234567890' => ['nama' => 'Biagi'],
        '6281234567891' => ['nama' => 'Andi'],
    ],
);
echo $result['broadcastId'] . ' — ' . $result['totalQueued'] . ' pesan';`,
};

const WEBHOOK_SNIPPETS = {
  js: `// Express — PENTING: pakai express.raw agar body tetap mentah
app.post('/webhook/notification',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    try {
      const event = client.webhooks.verify({
        payload: req.body.toString(),
        headers: {
          id: req.headers['webhook-id'],
          timestamp: req.headers['webhook-timestamp'],
          signature: req.headers['webhook-signature'],
        },
        secret: process.env.NGW_WEBHOOK_SECRET, // whsec_...
      });
      // event.type, event.data.messageId, event.data.status
      res.json({ received: true });
    } catch {
      res.status(400).json({ error: 'Invalid webhook' });
    }
  }
);`,
  python: `# FastAPI (async)
from fastapi import FastAPI, Request, Header, HTTPException

app = FastAPI()

@app.post("/webhook/notification")
async def webhook(
    request: Request,
    webhook_id: str = Header(alias="webhook-id"),
    webhook_timestamp: str = Header(alias="webhook-timestamp"),
    webhook_signature: str = Header(alias="webhook-signature"),
):
    raw_body = await request.body()
    try:
        event = client.webhooks.verify(
            payload=raw_body,
            headers={
                "webhook-id": webhook_id,
                "webhook-timestamp": webhook_timestamp,
                "webhook-signature": webhook_signature,
            },
            secret=os.environ["NGW_WEBHOOK_SECRET"],
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook")
    return {"received": True}

# Flask (sync)
@app.post('/webhook/notification')
def webhook():
    event = client.webhooks.verify(
        payload=request.get_data(),    # raw body wajib
        headers=dict(request.headers),
        secret=os.environ["NGW_WEBHOOK_SECRET"],
    )
    return {"received": True}`,
  php: `<?php
// PHP Native / Laravel Controller

use NotificationGateway\\Exception\\WebhookVerificationException;

// Ambil raw body — WAJIB sebelum framework mem-parse-nya
$rawBody = file_get_contents('php://input');

try {
    $event = $client->webhooks->verify(
        rawBody: $rawBody,
        headers: getallheaders(), // atau $request->headers->all() di Laravel
        secret: $_ENV['NGW_WEBHOOK_SECRET'], // whsec_...
    );
} catch (WebhookVerificationException $e) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid webhook']);
    exit;
}

// Proses event
// $event['type'], $event['data']['messageId'], $event['data']['status']
echo json_encode(['received' => true]);`,
};

// ─── REST API snippets ────────────────────────────────────────────────────────
const REST_SNIPPETS = {
  auth: `# Semua request ke Gateway hanya butuh 2 header ini:
#   x-api-key:    API Key dari dashboard (ngw_prod_... / ngw_sand_...)
#   Content-Type: application/json
#
# Endpoint:
#   POST /v1/notifications/send        → kirim 1 pesan
#   POST /v1/notifications/broadcast   → kirim ke banyak penerima`,
  send: `curl -X POST http://localhost:3001/v1/notifications/send \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ngw_prod_xxxxxxxx" \\
  -d '{
    "channel": "WHATSAPP",
    "recipient": "6281234567890",
    "body": "Halo! Pesanan Anda #INV-10291 telah dikirim."
  }'

# Respons sukses (HTTP 202):
# { "success": true, "data": { "messageId": "msg_...", "status": "QUEUED" } }`,
  broadcast: `curl -X POST http://localhost:3001/v1/notifications/broadcast \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ngw_prod_xxxxxxxx" \\
  -d '{
    "channel": "EMAIL",
    "recipients": ["budi@mail.com", "andi@mail.com"],
    "subject": "Pengumuman Penting",
    "body": "<h1>Halo!</h1><p>Ada pembaruan sistem.</p>"
  }'`,
};

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { icon: KeyRound, title: "1. Pengajuan & Key", desc: "Ajukan project baru. Setelah Admin menyetujui, API Key otomatis diterbitkan." },
  { icon: Package, title: "2. Install SDK", desc: "Pilih SDK resmi: npm (Node.js/TS), pip (Python), atau Composer (PHP)." },
  { icon: Activity, title: "3. Handshake (Ping)", desc: "Simpan key di .env lalu jalankan client.ping() untuk memvalidasi koneksi ke Gateway." },
  { icon: Code2, title: "4. Kirim & Notifikasi", desc: "Kirim pesan via whatsapp.send(), email.send(), atau broadcast dari aplikasi Anda." },
];

// ─── SdkPage ──────────────────────────────────────────────────────────────────
export default function SdkPage() {
  const { activeProject } = useProjectContext();
  const [apiKeys, setApiKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sdkLang, setSdkLang] = useState("js");
  const [webhookLang, setWebhookLang] = useState("js");

  const fetchKeys = useCallback(async () => {
    if (!activeProject?.id) { setLoadingKeys(false); return; }
    try {
      setRefreshing(true);
      const res = await apiGet("/v1/clients/api-keys");
      const allKeys = res?.data || [];
      setApiKeys(allKeys.filter((k) => k.project_id === activeProject.id));
    } catch {
      setApiKeys([]);
    } finally {
      setLoadingKeys(false);
      setRefreshing(false);
    }
  }, [activeProject?.id]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const activeKey = apiKeys.find((k) => k.is_active);
  const isConnected = !!(activeKey?.last_used_at);

  return (
    <>
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">SDK & Integrasi</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Hubungkan aplikasi Anda ke Notification Gateway dalam hitungan menit menggunakan SDK resmi.
        </p>
      </div>

      {/* Pending Approval Notice */}
      {activeProject && !activeProject.is_active && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-700 dark:text-amber-300">
          <Clock size={18} className="shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-sm block mb-0.5">Project Belum Disetujui Admin</span>
            Pengajuan proyek <strong>{activeProject.name}</strong> sedang dalam tahap verifikasi oleh Admin Platform. Setelah disetujui, API Key dan koneksi SDK akan aktif secara otomatis.
          </div>
        </div>
      )}

      {/* Telemetri Status Koneksi SDK (Handshake) */}
      {activeProject && (
        <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5 space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--neutral-border)]">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isConnected ? "bg-emerald-500" : "bg-amber-500"}`}></span>
              </span>
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                  Status Koneksi SDK:
                  <span className={isConnected ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                    {isConnected ? "🟢 Terhubung (SDK Aktif)" : "🟡 Menunggu Handshake Pertama"}
                  </span>
                </h3>
              </div>
            </div>

            <button
              onClick={fetchKeys}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--neutral-bg)] transition-colors disabled:opacity-50"
            >
              <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
              Cek Ulang Status
            </button>
          </div>

          <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
            {isConnected ? (
              <p>
                Koneksi SDK berhasil diverifikasi oleh Notification Gateway. Sinyal terakhir diterima pada:{" "}
                <strong className="font-mono text-[var(--text-primary)]">
                  {new Date(activeKey.last_used_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" })} WIB
                </strong>
                .
              </p>
            ) : (
              <p>
                Gateway belum mendeteksi aktivitas koneksi dari SDK untuk project ini. Jalankan uji koneksi (handshake) menggunakan metode <code className="font-mono font-semibold text-[var(--text-primary)]">client.ping()</code> untuk memvalidasi integrasi Anda.
              </p>
            )}
          </div>

          {/* Handshake Code Box */}
          <div className="rounded-lg bg-zinc-950 dark:bg-black text-zinc-100 p-4 font-mono text-xs border border-zinc-800 space-y-2">
            <div className="text-zinc-500 text-[11px]">// 1. Tambahkan ke file .env aplikasi Anda:</div>
            <div className="text-zinc-200">
              NGW_API_KEY={activeKey ? `${activeKey.key_prefix}••••••••${activeKey.key_preview}` : "ngw_prod_xxxxxxxx"}
            </div>
            <div className="text-zinc-200">NGW_BASE_URL=http://localhost:3001</div>
            <div className="pt-2 text-zinc-500 text-[11px]">// 2. Uji handshake koneksi SDK:</div>
            <div className="text-emerald-400">const res = await client.ping();</div>
            <div className="text-zinc-400">console.log(res);</div>
            <div className="text-zinc-500 text-[11px]">// Respons gateway saat terhubung (HTTP 200):</div>
            <div className="text-zinc-400">{`// { success: true, project: "${activeProject.slug}", environment: "${activeKey?.environment || "production"}" }`}</div>
          </div>
        </div>
      )}

      {/* API Key Info */}
      {activeProject && (
        <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <KeyRound size={16} className="text-[var(--text-secondary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">API Key untuk Project: {activeProject.name}</h3>
          </div>
          {loadingKeys ? (
            <p className="text-xs text-[var(--text-muted)]">Memuat API Key...</p>
          ) : activeKey ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-[var(--text-primary)]">
                  {activeKey.key_prefix}••••••••{activeKey.key_preview}
                </code>
                <span className={"text-[10px] px-2 py-1 rounded-full font-medium " + (activeKey.environment === "production" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400")}>
                  {activeKey.environment}
                </span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">
                Gunakan API Key lengkap yang Anda simpan saat disetujui atau dibuat. Jika hilang, Anda dapat meregenerasi key di menu Kelola API Key.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle size={14} />
              <p className="text-xs">
                {activeProject.is_active
                  ? <span>Belum ada API Key aktif. <a href="/client/api-keys" className="underline">Buat API Key</a> terlebih dahulu.</span>
                  : <span>Menunggu persetujuan Admin sebelum API Key diterbitkan.</span>}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Langkah integrasi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STEPS.map((s) => (
          <div key={s.title} className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-4">
            <div className="p-2 rounded-lg bg-[var(--primary)]/10 w-fit mb-3">
              <s.icon size={18} className="text-[var(--text-primary)]" />
            </div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{s.title}</h3>
            <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* ===== SDK MULTI-BAHASA ===== */}
      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5 space-y-5">
        {/* Header + badge links */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Package size={16} className="text-[var(--text-primary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">SDK Resmi — Pilih Bahasa Anda</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Tersedia untuk JavaScript/Node.js, Python, dan PHP. Semua SDK mendukung WhatsApp, Email, Broadcast, dan verifikasi Webhook.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <BadgeLink href="https://www.npmjs.com/package/notification-gateway-sdk" label="npm" color="red" />
            <BadgeLink href="https://pypi.org/project/notification-gateway-sdk/" label="PyPI" color="blue" />
            <BadgeLink href="https://packagist.org/packages/notification-gateway/sdk" label="Packagist" color="orange" />
          </div>
        </div>

        {/* Tab pemilih bahasa */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <LangTabs tabs={SDK_LANGS} active={sdkLang} onChange={setSdkLang} />
        </div>

        {/* Install */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CodeBlock title="Instalasi" code={INSTALL_SNIPPETS[sdkLang]} />
          <CodeBlock title="Inisialisasi Client" code={INIT_SNIPPETS[sdkLang]} />
        </div>

        {/* WhatsApp + Email */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={15} className="text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs font-semibold text-[var(--text-primary)]">WhatsApp</h4>
            </div>
            <CodeBlock title="Kirim WhatsApp" code={WHATSAPP_SNIPPETS[sdkLang]} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mail size={15} className="text-blue-600 dark:text-blue-400" />
              <h4 className="text-xs font-semibold text-[var(--text-primary)]">Email</h4>
            </div>
            <CodeBlock title="Kirim Email" code={EMAIL_SNIPPETS[sdkLang]} />
          </div>
        </div>

        {/* Broadcast + Webhook */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Radio size={15} className="text-purple-600 dark:text-purple-400" />
              <h4 className="text-xs font-semibold text-[var(--text-primary)]">Broadcast Massal</h4>
            </div>
            <CodeBlock title="Broadcast" code={BROADCAST_SNIPPETS[sdkLang]} />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-amber-600 dark:text-amber-400" />
              <h4 className="text-xs font-semibold text-[var(--text-primary)]">Verifikasi Webhook</h4>
              <LangTabs
                tabs={[
                  { id: "js", label: "JS" },
                  { id: "python", label: "Python" },
                  { id: "php", label: "PHP" },
                ]}
                active={webhookLang}
                onChange={setWebhookLang}
              />
            </div>
            <CodeBlock title="Webhook Verify" code={WEBHOOK_SNIPPETS[webhookLang]} />
          </div>
        </div>
      </div>

      {/* ===== REST API — tanpa SDK ===== */}
      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5 space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-[var(--text-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">REST API — Tanpa SDK</h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
            Untuk bahasa lain (Go, Java, C#, Ruby, dll) — cukup kirim HTTP POST dengan API Key.
            Kontrak di bawah berlaku sama untuk semua bahasa.
          </p>
        </div>
        <CodeBlock title="Kontrak API" code={REST_SNIPPETS.auth} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CodeBlock title="cURL — Kirim 1 Pesan" code={REST_SNIPPETS.send} />
          <CodeBlock title="cURL — Broadcast" code={REST_SNIPPETS.broadcast} />
        </div>

        {/* Format respons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg border border-[var(--neutral-border)] p-3.5">
            <p className="text-[11px] font-semibold text-[var(--text-primary)] mb-1.5">Format Respons Sukses</p>
            <pre className="text-[11px] font-mono text-[var(--text-secondary)] leading-relaxed">{`{
  "success": true,
  "data": {
    "messageId": "msg_...",
    "status": "QUEUED"
  }
}`}</pre>
          </div>
          <div className="rounded-lg border border-[var(--neutral-border)] p-3.5">
            <p className="text-[11px] font-semibold text-[var(--text-primary)] mb-1.5">Format Respons Error</p>
            <pre className="text-[11px] font-mono text-[var(--text-secondary)] leading-relaxed">{`{
  "success": false,
  "error": "Invalid API Key"
}

// HTTP 401 → API Key salah/nonaktif
// HTTP 400 → payload tidak valid
// HTTP 429 → rate limit / kuota habis`}</pre>
          </div>
        </div>
      </div>

      {/* Catatan sandbox */}
      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-2">Mode Sandbox</h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Gunakan API Key berprefix <code className="font-mono">ngw_sand_</code> untuk menguji integrasi tanpa
          mengirim pesan sungguhan maupun biaya. Respons tetap tercatat di riwayat sehingga Anda bisa
          memvalidasi alur end-to-end sebelum beralih ke key production <code className="font-mono">ngw_prod_</code>.
        </p>
      </div>
    </>
  );
}
