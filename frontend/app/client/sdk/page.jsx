"use client";

import { useState, useEffect } from "react";
import { Code2, Copy, Check, Package, KeyRound, MessageSquare, Mail, Radio, ShieldCheck, AlertCircle } from "lucide-react";
import { useProjectContext } from "@/lib/project-context";
import { apiGet } from "@/lib/api";

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
          {copied ? <><Check size={12} className="text-emerald-500" /> Copied!</> : <><Copy size={12} /> Copy</>}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-[var(--text-primary)] bg-[var(--neutral-bg)] overflow-x-auto leading-relaxed">{code}</pre>
    </div>
  );
}

const SNIPPETS = {
  install: `npm install @notification-gateway/sdk
# atau via git dependency (monorepo internal):
# npm install git+https://github.com/perusahaan/notification-service.git#main:packages/sdk`,
  init: `import { NotificationClient } from '@notification-gateway/sdk';

// Inisialisasi dengan API Key dari dashboard
const client = new NotificationClient({
  apiKey: process.env.NGW_API_KEY,   // ngw_prod_... atau ngw_sand_...
  baseUrl: 'http://localhost:3001',  // URL Gateway (ganti dengan production URL)
  timeout: 10000
});`,
  whatsapp: `// WhatsApp teks biasa
await client.whatsapp.send({
  to: '6281234567890',
  body: 'Halo! Pesanan Anda #INV-10291 telah dikirim.'
});

// WhatsApp dengan template ter-approve
await client.whatsapp.send({
  to: '6281234567890',
  templateCode: 'otp_verification',
  variables: { nama: 'Budi', otp: '894211' }
});`,
  email: `await client.email.send({
  to: 'budi@perusahaan.com',
  subject: 'Konfirmasi Pembayaran #INV-10291',
  body: '<h1>Terima kasih!</h1><p>Pembayaran Anda telah diterima.</p>'
});`,
  broadcast: `const res = await client.broadcast.send({
  channel: 'WHATSAPP',               // atau 'EMAIL'
  recipients: ['6281234567890', '6281234567891'],
  templateCode: 'pengumuman_hrd',
  variables: { periode: 'Q3 2026' },
  // Personalisasi nama per penerima (opsional)
  recipientVariables: {
    '6281234567890': { nama: 'Biagi' },
    '6281234567891': { nama: 'Andi' }
  }
});
console.log(res.broadcastId, res.totalQueued);`,
  webhook: `// Verifikasi webhook (pola Resend/Svix) di endpoint Anda
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
);`,
};

// === REST API bahasa-agnostic: kontrak endpoint yang sama untuk SEMUA bahasa ===
const REST_SNIPPETS = {
  auth: `# Semua request ke Gateway hanya butuh 2 header ini — berlaku di bahasa apa pun:
#   x-api-key:    API Key dari dashboard (ngw_prod_... / ngw_sand_...)
#   Content-Type: application/json
#
# Base URL (development): http://localhost:3001
# Endpoint pengiriman:
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

# Respons sukses (HTTP 202 — pesan masuk antrean, status akhir via webhook):
# {
#   "success": true,
#   "data": { "messageId": "msg_...", "status": "QUEUED" }
# }`,
  broadcast: `curl -X POST http://localhost:3001/v1/notifications/broadcast \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ngw_prod_xxxxxxxx" \\
  -d '{
    "channel": "EMAIL",
    "recipients": ["budi@mail.com", "andi@mail.com"],
    "subject": "Pengumuman Penting",
    "body": "<h1>Halo!</h1><p>Ada pembaruan sistem.</p>",
    "recipientVariables": {
      "budi@mail.com": { "nama": "Budi" },
      "andi@mail.com": { "nama": "Andi" }
    }
  }'`,
};

// Contoh konsumsi REST API langsung (tanpa SDK) per bahasa
const REST_EXAMPLES = {
  js: `// Node.js 18+ — fetch bawaan, tanpa install apa pun
const res = await fetch('http://localhost:3001/v1/notifications/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': process.env.NGW_API_KEY,
  },
  body: JSON.stringify({
    channel: 'WHATSAPP',
    recipient: '6281234567890',
    body: 'Halo! Pesanan Anda telah dikirim.',
  }),
});
const result = await res.json();
console.log(result.data.messageId);`,
  python: `# Python — cukup library 'requests' (pip install requests)
import requests

res = requests.post(
    'http://localhost:3001/v1/notifications/send',
    headers={'x-api-key': 'ngw_prod_xxxxxxxx'},
    json={
        'channel': 'WHATSAPP',
        'recipient': '6281234567890',
        'body': 'Halo! Pesanan Anda telah dikirim.',
    },
    timeout=10,
)
print(res.json()['data']['messageId'])`,
  php: `<?php
// PHP — cURL bawaan, tanpa library tambahan
$ch = curl_init('http://localhost:3001/v1/notifications/send');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'x-api-key: ngw_prod_xxxxxxxx',
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'channel' => 'WHATSAPP',
        'recipient' => '6281234567890',
        'body' => 'Halo! Pesanan Anda telah dikirim.',
    ]),
]);
$result = json_decode(curl_exec($ch), true);
curl_close($ch);
echo $result['data']['messageId'];`,
};

// Cara hitung signature webhook MANUAL (tanpa SDK) — algoritma universal
const WEBHOOK_MANUAL = {
  python: `# Verifikasi webhook manual — Python (Flask/FastAPI/dll)
import hmac, hashlib, base64, time, json

def verify_webhook(raw_body: bytes, headers: dict, secret: str) -> dict:
    wh_id       = headers.get('webhook-id')
    timestamp   = headers.get('webhook-timestamp')
    signature   = headers.get('webhook-signature')
    if not (wh_id and timestamp and signature):
        raise ValueError('Header webhook tidak lengkap')

    # 1. Cek timestamp (toleransi 5 menit — anti replay attack)
    if abs(time.time() - int(timestamp)) > 300:
        raise ValueError('Timestamp kadaluarsa')

    # 2. Signature = base64( HMAC_SHA256("id.timestamp.rawBody") ), prefix "v1,"
    key = base64.b64decode(secret[6:]) if secret.startswith('whsec_') else secret.encode()
    signed = f"{wh_id}.{timestamp}.{raw_body.decode()}".encode()
    expected = 'v1,' + base64.b64encode(hmac.new(key, signed, hashlib.sha256).digest()).decode()

    if not any(hmac.compare_digest(expected, s) for s in signature.split(' ')):
        raise ValueError('Signature tidak valid')

    return json.loads(raw_body)

# Pemakaian di Flask:
# @app.post('/webhook/notification')
# def webhook():
#     event = verify_webhook(request.get_data(), request.headers, 'whsec_...')
#     return {'received': True}`,
  php: `<?php
// Verifikasi webhook manual — PHP native
function verifyWebhook(string $rawBody, array $headers, string $secret): array {
    $id        = $headers['webhook-id']        ?? null;
    $timestamp = $headers['webhook-timestamp'] ?? null;
    $signature = $headers['webhook-signature'] ?? null;
    if (!$id || !$timestamp || !$signature) {
        throw new Exception('Header webhook tidak lengkap');
    }

    // 1. Cek timestamp (toleransi 5 menit — anti replay attack)
    if (abs(time() - (int)$timestamp) > 300) {
        throw new Exception('Timestamp kadaluarsa');
    }

    // 2. Signature = base64( HMAC_SHA256("id.timestamp.rawBody") ), prefix "v1,"
    $key = str_starts_with($secret, 'whsec_')
        ? base64_decode(substr($secret, 6))
        : $secret;
    $expected = 'v1,' . base64_encode(
        hash_hmac('sha256', "{$id}.{$timestamp}.{$rawBody}", $key, true)
    );

    $valid = false;
    foreach (explode(' ', $signature) as $sig) {
        if (hash_equals($expected, $sig)) { $valid = true; break; }
    }
    if (!$valid) throw new Exception('Signature tidak valid');

    return json_decode($rawBody, true);
}

// Pemakaian:
// $rawBody = file_get_contents('php://input'); // WAJIB raw body mentah
// $event = verifyWebhook($rawBody, getallheaders(), 'whsec_...');
// echo $event['data']['messageId'];`,
};

const STEPS = [
  { icon: KeyRound, title: "1. Buat API Key", desc: "Buka menu API Key, buat key Production atau Sandbox (ngw_sand_ untuk testing)." },
  { icon: Package, title: "2. Install SDK", desc: "Tambahkan @notification-gateway/sdk ke project Anda." },
  { icon: Code2, title: "3. Inisialisasi & Kirim", desc: "Panggil client.whatsapp.send() / client.email.send() dari backend Anda." },
  { icon: ShieldCheck, title: "4. Terima Webhook", desc: "Verifikasi signature untuk menerima status pengiriman real-time." },
];

// Tab pemilih bahasa untuk snippet REST API (dokumentasi bahasa-agnostic)
function LangTabs({ tabs, active, onChange }) {
  return (
    <div className="flex gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 w-fit">
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

export default function SdkPage() {
  const { activeProject } = useProjectContext();
  const [apiKeys, setApiKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [restLang, setRestLang] = useState("js");
  const [webhookLang, setWebhookLang] = useState("python");

  useEffect(() => {
    async function fetchKeys() {
      if (!activeProject?.id) { setLoadingKeys(false); return; }
      try {
        const res = await apiGet("/v1/clients/api-keys");
        const allKeys = res?.data || [];
        setApiKeys(allKeys.filter(k => k.project_id === activeProject.id));
      } catch { setApiKeys([]); }
      finally { setLoadingKeys(false); }
    }
    fetchKeys();
  }, [activeProject?.id]);

  const activeKey = apiKeys.find(k => k.is_active);

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">SDK & Integrasi</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Hubungkan aplikasi Anda ke Notification Gateway dalam hitungan menit menggunakan SDK resmi.
        </p>
      </div>

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
                Gunakan API Key lengkap yang Anda simpan saat membuat key. Jika hilang, regenerate di menu API Keys.
              </p>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertCircle size={14} />
              <p className="text-xs">Belum ada API Key aktif. <a href="/client/api-keys" className="underline">Buat API Key</a> terlebih dahulu.</p>
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

      {/* Instalasi + Init */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CodeBlock title="Instalasi" code={SNIPPETS.install} />
        <CodeBlock title="Inisialisasi Client" code={SNIPPETS.init} />
      </div>

      {/* Channel usage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">WhatsApp (Baileys)</h3>
          </div>
          <CodeBlock title="client.whatsapp.send()" code={SNIPPETS.whatsapp} />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail size={16} className="text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Email (Nodemailer)</h3>
          </div>
          <CodeBlock title="client.email.send()" code={SNIPPETS.email} />
        </div>
      </div>

      {/* Broadcast + Webhook */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Radio size={16} className="text-purple-600 dark:text-purple-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Broadcast Massal</h3>
          </div>
          <CodeBlock title="client.broadcast.send()" code={SNIPPETS.broadcast} />
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-amber-600 dark:text-amber-400" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Verifikasi Webhook</h3>
          </div>
          <CodeBlock title="client.verifyWebhook()" code={SNIPPETS.webhook} />
        </div>
      </div>

      {/* ===== REST API — untuk client yang TIDAK pakai JavaScript ===== */}
      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5 space-y-5">
        <div>
          <div className="flex items-center gap-2">
            <Code2 size={16} className="text-[var(--text-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">REST API — Untuk Bahasa Apa Pun</h3>
          </div>
          <p className="text-xs text-[var(--text-secondary)] mt-1.5 leading-relaxed">
            Aplikasi Anda tidak pakai JavaScript? Tidak masalah. Gateway ini adalah REST API biasa —
            cukup kirim HTTP POST dengan API Key. Kontrak di bawah berlaku sama untuk PHP, Python, Go, Java, C#, dan lainnya.
          </p>
        </div>

        {/* Kontrak API */}
        <CodeBlock title="Kontrak API (semua bahasa)" code={REST_SNIPPETS.auth} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <CodeBlock title="cURL — Kirim 1 Pesan" code={REST_SNIPPETS.send} />
          <CodeBlock title="cURL — Broadcast" code={REST_SNIPPETS.broadcast} />
        </div>

        {/* Contoh per bahasa */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-xs font-semibold text-[var(--text-primary)]">Contoh Kirim Pesan per Bahasa (tanpa SDK)</h4>
            <LangTabs
              tabs={[
                { id: "js", label: "Node.js" },
                { id: "python", label: "Python" },
                { id: "php", label: "PHP" },
              ]}
              active={restLang}
              onChange={setRestLang}
            />
          </div>
          <CodeBlock
            title={{ js: "Node.js — fetch bawaan", python: "Python — requests", php: "PHP — cURL" }[restLang]}
            code={REST_EXAMPLES[restLang]}
          />
        </div>

        {/* Webhook manual per bahasa */}
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-xs font-semibold text-[var(--text-primary)]">Verifikasi Webhook Manual (tanpa SDK)</h4>
            <LangTabs
              tabs={[
                { id: "python", label: "Python" },
                { id: "php", label: "PHP" },
              ]}
              active={webhookLang}
              onChange={setWebhookLang}
            />
          </div>
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
            Algoritma signature universal: <code className="font-mono">base64(HMAC_SHA256(&quot;webhook-id.webhook-timestamp.rawBody&quot;, secret))</code> dengan prefix <code className="font-mono">v1,</code>.
            Tersedia di semua bahasa (<code className="font-mono">hmac</code> di Python, <code className="font-mono">hash_hmac</code> di PHP, dst).
          </p>
          <CodeBlock
            title={{ python: "Python — hmac + hashlib", php: "PHP — hash_hmac" }[webhookLang]}
            code={WEBHOOK_MANUAL[webhookLang]}
          />
        </div>

        {/* Format respons & error */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
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
