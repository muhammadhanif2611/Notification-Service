"use client";

import { useState } from "react";
import { Send, AlertTriangle, Plus, X, Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";
import { useTemplates } from "@/hooks/useTemplates";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3001";
const STORAGE_KEY = "ngw_broadcast_apikey";

/**
 * BroadcastPage — Tester pengiriman massal ke banyak penerima sekaligus.
 * Endpoint /v1/notifications/broadcast memakai API Key (bukan JWT), sehingga
 * client memasukkan API Key manual (disimpan di sessionStorage tab ini saja).
 */
export default function BroadcastPage() {
  const [apiKey, setApiKey] = useState(() => (typeof window !== "undefined" ? sessionStorage.getItem(STORAGE_KEY) || "" : ""));
  const [showApiKey, setShowApiKey] = useState(false);
  const [channel, setChannel] = useState("WHATSAPP");
  const { templates } = useTemplates(null);
  const [templateCode, setTemplateCode] = useState("");
  const [body, setBody] = useState("");
  const [subject, setSubject] = useState("");
  const [recipients, setRecipients] = useState([""]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);


  const handleApiKeyChange = (val) => {
    setApiKey(val);
    if (val) sessionStorage.setItem(STORAGE_KEY, val);
    else sessionStorage.removeItem(STORAGE_KEY);
  };

  const approvedTemplates = templates.filter(
    (t) => t.status === "APPROVED" && t.channel === channel
  );

  const addRecipient = () => setRecipients([...recipients, ""]);
  const removeRecipient = (i) => setRecipients(recipients.filter((_, idx) => idx !== i));
  const updateRecipient = (i, val) => {
    const next = [...recipients];
    next[i] = val;
    setRecipients(next);
  };

  const validRecipients = recipients.map((r) => r.trim()).filter(Boolean);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!apiKey.trim()) { alert("Masukkan API Key terlebih dahulu."); return; }
    if (validRecipients.length === 0) { alert("Tambahkan minimal 1 penerima."); return; }
    if (!templateCode && !body.trim()) { alert("Isi template atau body pesan."); return; }

    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/v1/notifications/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey.trim() },
        body: JSON.stringify({
          channel,
          recipients: validRecipients,
          templateCode: templateCode || undefined,
          body: body || undefined,
          subject: channel === "EMAIL" ? subject : undefined,
        }),
      });
      const data = await res.json();
      setResult({ ok: res.ok, data });
    } catch (err) {
      setResult({ ok: false, data: { error: { message: err.message } } });
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold text-[var(--text-primary)]">Broadcast</h2>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Kirim pesan yang sama ke banyak penerima sekaligus (mis. pengumuman HRD ke seluruh karyawan).
        </p>
      </div>

      {/* Security notice */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
        <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
          <strong>Perhatian keamanan:</strong> Broadcast memakai API Key (bukan sesi login). API Key hanya disimpan
          di <code className="font-mono">sessionStorage</code> tab ini dan tidak dikirim ke server lain. Untuk produksi,
          panggil endpoint broadcast dari <strong>backend aplikasi Anda</strong> menggunakan SDK, bukan dari browser.
        </div>
      </div>

      <form onSubmit={handleSend} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Kolom kiri: konfigurasi */}
        <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">API Key</label>
            <div className="relative">
              <input
                type={showApiKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="ngw_prod_... atau ngw_sand_..."
                className="w-full px-3 py-2 pr-10 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]"
              />
              <button
                type="button" onClick={() => setShowApiKey(!showApiKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {apiKey.startsWith("ngw_sand_") && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">Mode Sandbox — pesan tidak benar-benar terkirim.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Channel</label>
            <select
              value={channel} onChange={(e) => { setChannel(e.target.value); setTemplateCode(""); }}
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]"
            >
              <option value="WHATSAPP">WhatsApp</option>
              <option value="EMAIL">Email</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Template (opsional, hanya yang APPROVED)</label>
            <select
              value={templateCode} onChange={(e) => setTemplateCode(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]"
            >
              <option value="">— Tanpa template (isi manual) —</option>
              {approvedTemplates.map((t) => (
                <option key={t.id} value={t.code}>{t.code}</option>
              ))}
            </select>
          </div>

          {channel === "EMAIL" && !templateCode && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Subject Email</label>
              <input
                type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Pengumuman Penting"
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]"
              />
            </div>
          )}

          {!templateCode && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Isi Pesan</label>
              <textarea
                rows={4} value={body} onChange={(e) => setBody(e.target.value)}
                placeholder="Tulis isi pesan broadcast..."
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]"
              />
            </div>
          )}
        </div>

        {/* Kolom kanan: penerima + hasil */}
        <div className="space-y-4">
          <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Penerima ({validRecipients.length})
              </label>
              <button
                type="button" onClick={addRecipient}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Plus size={14} /> Tambah
              </button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recipients.map((r, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text" value={r} onChange={(e) => updateRecipient(i, e.target.value)}
                    placeholder={channel === "WHATSAPP" ? "6281234567890" : "user@email.com"}
                    className="flex-1 px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]"
                  />
                  {recipients.length > 1 && (
                    <button type="button" onClick={() => removeRecipient(i)} className="text-[var(--text-muted)] hover:text-red-500">
                      <X size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit" disabled={sending}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
          >
            {sending ? "Mengirim..." : <><Send size={16} /> Kirim Broadcast</>}
          </button>

          {result && (
            <div className={`flex items-start gap-3 p-4 rounded-lg border ${
              result.ok
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}>
              {result.ok
                ? <CheckCircle size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                : <XCircle size={18} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />}
              <div className="text-xs leading-relaxed">
                {result.ok ? (
                  <>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">Broadcast masuk antrean</p>
                    <p className="text-[var(--text-secondary)] mt-1 font-mono">
                      broadcastId: {result.data?.data?.broadcastId || "-"}<br />
                      totalQueued: {result.data?.data?.totalQueued ?? "-"}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-red-700 dark:text-red-300">Gagal mengirim</p>
                    <p className="text-[var(--text-secondary)] mt-1">{result.data?.error?.message || "Terjadi kesalahan"}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </form>
    </>
  );
}
