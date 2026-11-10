"use client";

import { API_URL } from "@/lib/config";
import { useState, useEffect, useCallback } from "react";
import {
  Code2, Copy, Check, KeyRound, MessageSquare,
  Mail, Radio, ShieldCheck, AlertCircle,
  Activity, RefreshCw, Clock, FileText,
} from "lucide-react";
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
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
        >
          {copied ? (
            <>
              <Check size={12} className="text-emerald-500" /> Disalin!
            </>
          ) : (
            <>
              <Copy size={12} /> Salin
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-xs font-mono text-[var(--text-primary)] bg-[var(--neutral-bg)] overflow-x-auto leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

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

const CODE_LANGS = [
  { id: "curl", label: "cURL" },
  { id: "js", label: "Node.js (fetch)" },
  { id: "python", label: "Python (requests)" },
  { id: "php", label: "PHP (cURL)" },
];

const WEBHOOK_LANGS = [
  { id: "js", label: "Node.js" },
  { id: "python", label: "Python" },
  { id: "php", label: "PHP" },
];

const PING_SNIPPETS = {
  curl: `curl -X GET "${API_URL}/v1/notifications/ping" \\
  -H "x-api-key: ngw_prod_xxxxxxxx"`,
  js: `const response = await fetch("${API_URL}/v1/notifications/ping", {
  method: "GET",
  headers: {
    "x-api-key": process.env.NGW_API_KEY,
  },
});

const result = await response.json();
console.log(result);`,
  python: `import os
import requests

response = requests.get(
    "${API_URL}/v1/notifications/ping",
    headers={"x-api-key": os.environ["NGW_API_KEY"]},
    timeout=10,
)
print(response.json())`,
  php: `<?php
$ch = curl_init("${API_URL}/v1/notifications/ping");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "x-api-key: " . $_ENV["NGW_API_KEY"],
    ],
]);
$response = curl_exec($ch);
curl_close($ch);
echo $response;`,
};

const WHATSAPP_SNIPPETS = {
  curl: `# Opsi A: Pesan Manual (Teks Langsung)
curl -X POST "${API_URL}/v1/notifications/send" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ngw_prod_xxxxxxxx" \\
  -d '{
    "channel": "WHATSAPP",
    "recipient": "6281234567890",
    "body": "Halo! Pesanan Anda #INV-10291 telah dikirim."
  }'

# Opsi B: Menggunakan Template & Variabel Dinamis
curl -X POST "${API_URL}/v1/notifications/send" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ngw_prod_xxxxxxxx" \\
  -d '{
    "channel": "WHATSAPP",
    "recipient": "6281234567890",
    "templateCode": "otp_verification",
    "variables": {
      "nama": "Budi",
      "otp": "894211"
    }
  }'`,
  js: `// Kirim WhatsApp menggunakan Template & Variabel
const response = await fetch("${API_URL}/v1/notifications/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.NGW_API_KEY,
  },
  body: JSON.stringify({
    channel: "WHATSAPP",
    recipient: "6281234567890",
    templateCode: "otp_verification",
    variables: {
      nama: "Budi",
      otp: "894211",
    },
  }),
});

const result = await response.json();`,
  python: `import os
import requests

response = requests.post(
    "${API_URL}/v1/notifications/send",
    headers={
        "Content-Type": "application/json",
        "x-api-key": os.environ["NGW_API_KEY"],
    },
    json={
        "channel": "WHATSAPP",
        "recipient": "6281234567890",
        "templateCode": "otp_verification",
        "variables": {"nama": "Budi", "otp": "894211"},
    },
    timeout=10,
)
print(response.json())`,
  php: `<?php
$payload = json_encode([
    "channel" => "WHATSAPP",
    "recipient" => "6281234567890",
    "templateCode" => "otp_verification",
    "variables" => [
        "nama" => "Budi",
        "otp" => "894211",
    ],
]);

$ch = curl_init("${API_URL}/v1/notifications/send");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "x-api-key: " . $_ENV["NGW_API_KEY"],
    ],
]);
$response = curl_exec($ch);
curl_close($ch);`,
};

const EMAIL_SNIPPETS = {
  curl: `curl -X POST "${API_URL}/v1/notifications/send" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ngw_prod_xxxxxxxx" \\
  -d '{
    "channel": "EMAIL",
    "recipient": "budi@perusahaan.com",
    "subject": "Konfirmasi Pembayaran #INV-10291",
    "body": "<h1>Terima kasih!</h1><p>Pembayaran Anda telah diterima.</p>"
  }'`,
  js: `const response = await fetch("${API_URL}/v1/notifications/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.NGW_API_KEY,
  },
  body: JSON.stringify({
    channel: "EMAIL",
    recipient: "budi@perusahaan.com",
    subject: "Konfirmasi Pembayaran #INV-10291",
    body: "<h1>Terima kasih!</h1><p>Pembayaran Anda telah diterima.</p>",
  }),
});

const result = await response.json();`,
  python: `import os
import requests

response = requests.post(
    "${API_URL}/v1/notifications/send",
    headers={
        "Content-Type": "application/json",
        "x-api-key": os.environ["NGW_API_KEY"],
    },
    json={
        "channel": "EMAIL",
        "recipient": "budi@perusahaan.com",
        "subject": "Konfirmasi Pembayaran #INV-10291",
        "body": "<h1>Terima kasih!</h1><p>Pembayaran Anda telah diterima.</p>",
    },
    timeout=10,
)
print(response.json())`,
  php: `<?php
$payload = json_encode([
    "channel" => "EMAIL",
    "recipient" => "budi@perusahaan.com",
    "subject" => "Konfirmasi Pembayaran #INV-10291",
    "body" => "<h1>Terima kasih!</h1><p>Pembayaran Anda telah diterima.</p>",
]);

$ch = curl_init("${API_URL}/v1/notifications/send");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "x-api-key: " . $_ENV["NGW_API_KEY"],
    ],
]);
$response = curl_exec($ch);
curl_close($ch);`,
};

const BROADCAST_SNIPPETS = {
  curl: `curl -X POST "${API_URL}/v1/notifications/broadcast" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ngw_prod_xxxxxxxx" \\
  -d '{
    "channel": "WHATSAPP",
    "recipients": ["6281234567890", "6281234567891"],
    "templateCode": "pengumuman_hrd",
    "variables": { "periode": "Q4 2026" },
    "recipientVariables": {
      "6281234567890": { "nama": "Budi" },
      "6281234567891": { "nama": "Andi" }
    }
  }'`,
  js: `const response = await fetch("${API_URL}/v1/notifications/broadcast", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.NGW_API_KEY,
  },
  body: JSON.stringify({
    channel: "WHATSAPP",
    recipients: ["6281234567890", "6281234567891"],
    templateCode: "pengumuman_hrd",
    variables: { periode: "Q4 2026" },
    recipientVariables: {
      "6281234567890": { nama: "Budi" },
      "6281234567891": { nama: "Andi" },
    },
  }),
});

const result = await response.json();`,
  python: `import os
import requests

response = requests.post(
    "${API_URL}/v1/notifications/broadcast",
    headers={
        "Content-Type": "application/json",
        "x-api-key": os.environ["NGW_API_KEY"],
    },
    json={
        "channel": "WHATSAPP",
        "recipients": ["6281234567890", "6281234567891"],
        "templateCode": "pengumuman_hrd",
        "variables": {"periode": "Q4 2026"},
        "recipientVariables": {
            "6281234567890": {"nama": "Budi"},
            "6281234567891": {"nama": "Andi"},
        },
    },
    timeout=15,
)
print(response.json())`,
  php: `<?php
$payload = json_encode([
    "channel" => "WHATSAPP",
    "recipients" => ["6281234567890", "6281234567891"],
    "templateCode" => "pengumuman_hrd",
    "variables" => ["periode" => "Q4 2026"],
    "recipientVariables" => [
        "6281234567890" => ["nama" => "Budi"],
        "6281234567891" => ["nama" => "Andi"],
    ],
]);

$ch = curl_init("${API_URL}/v1/notifications/broadcast");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "x-api-key: " . $_ENV["NGW_API_KEY"],
    ],
]);
$response = curl_exec($ch);
curl_close($ch);`,
};

const WEBHOOK_SNIPPETS = {
  js: `import crypto from "node:crypto";

app.post("/webhook/notification", express.raw({ type: "application/json" }), (req, res) => {
  const id = req.headers["webhook-id"];
  const timestamp = req.headers["webhook-timestamp"];
  const signature = req.headers["webhook-signature"];
  const rawBody = req.body.toString("utf8");

  const signedContent = \`\${id}.\${timestamp}.\${rawBody}\`;
  const expected = "v1," + crypto
    .createHmac("sha256", process.env.NGW_WEBHOOK_SECRET)
    .update(signedContent)
    .digest("hex");

  if (signature !== expected) {
    return res.status(401).json({ error: "Invalid webhook signature" });
  }

  const event = JSON.parse(rawBody);
  console.log("Webhook event:", event.type, event.data);
  return res.json({ received: true });
});`,
  python: `import hmac
import hashlib
import os
from fastapi import FastAPI, Request, Header, HTTPException

app = FastAPI()

@app.post("/webhook/notification")
async def receive_webhook(
    request: Request,
    webhook_id: str = Header(alias="webhook-id"),
    webhook_timestamp: str = Header(alias="webhook-timestamp"),
    webhook_signature: str = Header(alias="webhook-signature"),
):
    raw_body = (await request.body()).decode("utf-8")
    signed_content = f"{webhook_id}.{webhook_timestamp}.{raw_body}".encode("utf-8")
    digest = hmac.new(
        os.environ["NGW_WEBHOOK_SECRET"].encode("utf-8"),
        signed_content,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(webhook_signature, f"v1,{digest}"):
        raise HTTPException(status_code=401, detail="Invalid signature")

    return {"received": True}`,
  php: `<?php
$rawBody = file_get_contents("php://input");
$headers = array_change_key_case(getallheaders(), CASE_LOWER);

$id = $headers["webhook-id"] ?? "";
$timestamp = $headers["webhook-timestamp"] ?? "";
$signature = $headers["webhook-signature"] ?? "";

$signedContent = "{$id}.{$timestamp}.{$rawBody}";
$expected = "v1," . hash_hmac("sha256", $signedContent, $_ENV["NGW_WEBHOOK_SECRET"]);

if (!hash_equals($expected, $signature)) {
    http_response_code(401);
    echo json_encode(["error" => "Invalid signature"]);
    exit;
}

echo json_encode(["received" => true]);`,
};

const STEPS = [
  {
    icon: KeyRound,
    title: "1. Ajukan Project & API Key",
    desc: "Ajukan project di menu Projects. Setelah Admin menyetujui, salin API Key (ngw_prod_ / ngw_sand_) ke file .env aplikasi Anda.",
  },
  {
    icon: Activity,
    title: "2. Uji Koneksi (Ping)",
    desc: "Panggil endpoint GET /v1/notifications/ping dengan header x-api-key untuk memvalidasi konektivitas aplikasi Anda.",
  },
  {
    icon: FileText,
    title: "3. Siapkan Channel & Template",
    desc: "Tautkan nomor di menu WhatsApp Session dan buat template pesan berparameter {{...}} di menu Template Pesan.",
  },
  {
    icon: Code2,
    title: "4. Kirim Pesan & Webhook",
    desc: "Kirim pesan via POST /v1/notifications/send atau /broadcast, dan pantau statusnya secara real-time melalui Webhook.",
  },
];

const ENDPOINTS = [
  {
    method: "GET",
    path: "/v1/notifications/ping",
    desc: "Memverifikasi validitas API Key, status project, alokasi kuota harian, dan mencatat waktu koneksi terakhir.",
  },
  {
    method: "POST",
    path: "/v1/notifications/send",
    desc: "Mengirim 1 pesan notifikasi (WHATSAPP / EMAIL) menggunakan teks manual (body) atau kode template (templateCode + variables).",
  },
  {
    method: "POST",
    path: "/v1/notifications/broadcast",
    desc: "Mengirim pesan ke banyak penerima sekaligus dengan dukungan variabel umum (variables) dan personalisasi per penerima (recipientVariables).",
  },
];

// Halaman Dokumentasi Integrasi Client berisi langkah-langkah integrasi REST API Notification Gateway pada aplikasi klien.
export default function DocsPage() {
  const { activeProject } = useProjectContext();
  const projectId = activeProject?.id;
  const [apiKeys, setApiKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [codeLang, setCodeLang] = useState("curl");
  const [webhookLang, setWebhookLang] = useState("js");

  const fetchKeys = useCallback(async () => {
    if (!projectId) {
      setLoadingKeys(false);
      return;
    }
    try {
      setRefreshing(true);
      const res = await apiGet(`/v1/clients/api-keys?projectId=${encodeURIComponent(projectId)}`, { skipDedupe: true });
      const allKeys = res?.data || [];
      setApiKeys(allKeys.filter((k) => k.project_id === projectId));
    } catch {
      setApiKeys([]);
    } finally {
      setLoadingKeys(false);
      setRefreshing(false);
    }
  }, [projectId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!cancelled) await fetchKeys();
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchKeys]);

  const connectedKey = apiKeys
    .filter((k) => k.is_active && k.last_used_at)
    .sort((a, b) => new Date(b.last_used_at) - new Date(a.last_used_at))[0];
  const activeKey = connectedKey || apiKeys.find((k) => k.is_active);
  const isConnected = !!activeKey?.last_used_at;

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Dokumentasi Integrasi</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Panduan langkah demi langkah untuk mengintegrasikan Notification Gateway ke aplikasi Anda menggunakan REST API standar.
        </p>
      </div>

      {activeProject && !activeProject.is_active && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-amber-700 dark:text-amber-300">
          <Clock size={18} className="shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <span className="font-semibold text-sm block mb-0.5">Project Belum Disetujui Admin</span>
            Pengajuan proyek <strong>{activeProject.name}</strong> sedang dalam tahap verifikasi oleh Admin Platform. Setelah disetujui, API Key akan aktif secara otomatis.
          </div>
        </div>
      )}

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
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                Status Koneksi API:
                <span className={isConnected ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}>
                  {isConnected ? "🟢 Terhubung (API Aktif)" : "🟡 Menunggu Koneksi Pertama"}
                </span>
              </h3>
            </div>

            <button
              type="button"
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
                Koneksi REST API dari aplikasi Anda telah terverifikasi oleh Notification Gateway. Request terakhir diterima pada:{" "}
                <strong className="font-mono text-[var(--text-primary)]">
                  {new Date(activeKey.last_used_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "medium" })} WIB
                </strong>
                .
              </p>
            ) : (
              <p>
                Gateway belum mendeteksi panggilan API untuk project ini. Panggil endpoint{" "}
                <code className="font-mono font-semibold text-[var(--text-primary)]">GET /v1/notifications/ping</code> menggunakan API Key Anda untuk memvalidasi koneksi.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
            <div className="rounded-lg border border-[var(--neutral-border)] p-4 space-y-2">
              <div className="flex items-center gap-2">
                <KeyRound size={15} className="text-[var(--text-secondary)]" />
                <h4 className="text-xs font-semibold text-[var(--text-primary)]">API Key Project Aktif ({activeProject.name})</h4>
              </div>
              {loadingKeys ? (
                <p className="text-xs text-[var(--text-muted)]">Memuat API Key...</p>
              ) : activeKey ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-[var(--text-primary)]">
                      {activeKey.key_prefix}••••••••{activeKey.key_preview}
                    </code>
                    <span
                      className={
                        "text-[10px] px-2 py-1 rounded-full font-medium " +
                        (activeKey.environment === "production"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400")
                      }
                    >
                      {activeKey.environment}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    Gunakan API Key lengkap yang Anda simpan saat dibuat. Jika hilang, Anda dapat membuat atau merotasi key di menu <a href="/client/api-keys" className="underline">API Key</a>.
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <AlertCircle size={14} />
                  <p className="text-xs">
                    {activeProject.is_active ? (
                      <span>
                        Belum ada API Key aktif. <a href="/client/api-keys" className="underline">Buat API Key</a> terlebih dahulu.
                      </span>
                    ) : (
                      <span>Menunggu persetujuan Admin sebelum API Key diterbitkan.</span>
                    )}
                  </p>
                </div>
              )}
            </div>

            <CodeBlock
              title="Konfigurasi .env pada Aplikasi Anda"
              code={`NGW_BASE_URL=${API_URL}\nNGW_API_KEY=${activeKey ? `${activeKey.key_prefix}••••••••${activeKey.key_preview}` : "ngw_prod_xxxxxxxx"}\nNGW_WEBHOOK_SECRET=whsec_xxxxxxxx`}
            />
          </div>
        </div>
      )}

      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Daftar Endpoint REST API</h3>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Seluruh request dikirim ke Base URL <code className="font-mono text-[var(--text-primary)]">{API_URL}</code> dengan menyertakan header{" "}
            <code className="font-mono text-[var(--text-primary)]">x-api-key</code> dan{" "}
            <code className="font-mono text-[var(--text-primary)]">Content-Type: application/json</code>.
          </p>
        </div>

        <div className="overflow-x-auto rounded-lg border border-[var(--neutral-border)]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--neutral-bg)] text-[var(--text-secondary)] border-b border-[var(--neutral-border)] uppercase text-[11px]">
              <tr>
                <th className="px-4 py-2.5">Method</th>
                <th className="px-4 py-2.5">Endpoint</th>
                <th className="px-4 py-2.5">Kegunaan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--neutral-border)]">
              {ENDPOINTS.map((ep) => (
                <tr key={ep.path}>
                  <td className="px-4 py-3 font-mono font-semibold">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        ep.method === "GET"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {ep.method}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[var(--text-primary)]">{ep.path}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{ep.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Code2 size={16} className="text-[var(--text-primary)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Contoh Kode Integrasi per Langkah</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Tidak memerlukan instalasi SDK tambahan — gunakan HTTP client bawaan bahasa pemrograman Anda.
            </p>
          </div>
          <LangTabs tabs={CODE_LANGS} active={codeLang} onChange={setCodeLang} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Activity size={15} className="text-amber-600 dark:text-amber-400" />
              <h4 className="text-xs font-semibold text-[var(--text-primary)]">Langkah A — Uji Koneksi (Ping)</h4>
            </div>
            <CodeBlock title="GET /v1/notifications/ping" code={PING_SNIPPETS[codeLang]} />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <MessageSquare size={15} className="text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs font-semibold text-[var(--text-primary)]">Langkah B — Kirim Pesan WhatsApp</h4>
            </div>
            <CodeBlock title="POST /v1/notifications/send (WHATSAPP)" code={WHATSAPP_SNIPPETS[codeLang]} />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Mail size={15} className="text-blue-600 dark:text-blue-400" />
              <h4 className="text-xs font-semibold text-[var(--text-primary)]">Langkah C — Kirim Pesan Email</h4>
            </div>
            <CodeBlock title="POST /v1/notifications/send (EMAIL)" code={EMAIL_SNIPPETS[codeLang]} />
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <Radio size={15} className="text-purple-600 dark:text-purple-400" />
              <h4 className="text-xs font-semibold text-[var(--text-primary)]">Langkah D — Kirim Broadcast Massal</h4>
            </div>
            <CodeBlock title="POST /v1/notifications/broadcast" code={BROADCAST_SNIPPETS[codeLang]} />
          </div>
        </div>
      </div>

      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-amber-600 dark:text-amber-400" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Langkah E — Verifikasi Signature Webhook (HMAC-SHA256)</h3>
            </div>
            <p className="text-xs text-[var(--text-secondary)] mt-1">
              Setiap callback status pengiriman menyertakan header <code className="font-mono">webhook-id</code>,{" "}
              <code className="font-mono">webhook-timestamp</code>, dan <code className="font-mono">webhook-signature</code>.
            </p>
          </div>
          <LangTabs tabs={WEBHOOK_LANGS} active={webhookLang} onChange={setWebhookLang} />
        </div>

        <CodeBlock title="Verifikasi Webhook Tanpa Library Tambahan" code={WEBHOOK_SNIPPETS[webhookLang]} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-4">
          <p className="text-xs font-semibold text-[var(--text-primary)] mb-2">Format Respons Sukses (HTTP 202)</p>
          <pre className="text-[11px] font-mono text-[var(--text-secondary)] leading-relaxed">{`{
  "success": true,
  "data": {
    "messageId": "msg_01J...",
    "status": "QUEUED",
    "isSandbox": false
  }
}`}</pre>
        </div>

        <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-4">
          <p className="text-xs font-semibold text-[var(--text-primary)] mb-2">Format Respons Error</p>
          <pre className="text-[11px] font-mono text-[var(--text-secondary)] leading-relaxed">{`{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid payload"
  }
}
// 401: API Key salah/nonaktif
// 404: Template tidak ditemukan
// 422: Kontak masuk Suppression List
// 429: Rate limit / kuota harian habis`}</pre>
        </div>

        <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-4">
          <p className="text-xs font-semibold text-[var(--text-primary)] mb-2">Mode Sandbox vs Production</p>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
            Gunakan API Key berprefix <code className="font-mono">ngw_sand_</code> saat pengembangan agar pesan disimulasikan oleh worker tanpa mengirim WA/Email sungguhan dan tanpa memotong kuota harian. Saat siap rilis, ganti ke key <code className="font-mono">ngw_prod_</code>.
          </p>
        </div>
      </div>
    </>
  );
}
