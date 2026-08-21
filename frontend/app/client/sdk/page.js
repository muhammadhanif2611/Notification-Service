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
  variables: { periode: 'Q3 2026' }
});
console.log(res.broadcastId, res.totalQueued);`,
  webhook: `// Verifikasi signature webhook (HMAC SHA-256) di endpoint Anda
app.post('/webhook/notification', (req, res) => {
  const valid = client.verifyWebhook({
    payload: req.body,
    signature: req.headers['x-gateway-signature'],
    secret: process.env.WEBHOOK_SECRET
  });
  if (!valid) return res.status(401).json({ error: 'Invalid signature' });
  console.log(req.body.status, req.body.messageId);
  res.json({ received: true });
});`,
};

const STEPS = [
  { icon: KeyRound, title: "1. Buat API Key", desc: "Buka menu API Key, buat key Production atau Sandbox (ngw_sand_ untuk testing)." },
  { icon: Package, title: "2. Install SDK", desc: "Tambahkan @notification-gateway/sdk ke project Anda." },
  { icon: Code2, title: "3. Inisialisasi & Kirim", desc: "Panggil client.whatsapp.send() / client.email.send() dari backend Anda." },
  { icon: ShieldCheck, title: "4. Terima Webhook", desc: "Verifikasi signature untuk menerima status pengiriman real-time." },
];

export default function SdkPage() {
  const { activeProject } = useProjectContext();
  const [apiKeys, setApiKeys] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(true);

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
