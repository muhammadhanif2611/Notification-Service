"use client";

import { useState, useEffect, useCallback } from "react";
import QRCode from "qrcode";
import { MessageSquare, RefreshCw, Power, Wifi, WifiOff, QrCode } from "lucide-react";
import { apiGet, apiPost } from "@/lib/api";

const STATUS_STYLE = {
  CONNECTED: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  WAITING_QR: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  CONNECTING: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  DISCONNECTED: "bg-red-500/10 text-red-700 dark:text-red-400",
};

const STATUS_LABEL = {
  CONNECTED: "Terhubung",
  WAITING_QR: "Menunggu Scan QR",
  CONNECTING: "Menghubungkan...",
  DISCONNECTED: "Terputus",
};

export default function WhatsAppSessionPage() {
  const [session, setSession] = useState({ status: "DISCONNECTED", qr: null });
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiGet("/v1/clients/wa-session");
      const data = res.data || res;
      setSession(data);
      setError(null);
      setQrDataUrl(data.qr ? await QRCode.toDataURL(data.qr, { width: 280, margin: 2 }) : null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const initial = setTimeout(fetchStatus, 0);
    const interval = setInterval(fetchStatus, 5000);
    return () => { clearTimeout(initial); clearInterval(interval); };
  }, [fetchStatus]);

  const handleReset = async () => {
    if (!confirm("Reset sesi WhatsApp? Koneksi saat ini akan diputus dan QR baru akan dibuat.")) return;
    setResetting(true);
    try {
      await apiPost("/v1/clients/wa-session/reset", {});
      await fetchStatus();
    } catch (err) {
      alert("Gagal reset sesi: " + err.message);
    } finally {
      setResetting(false);
    }
  };

  const isConnected = session.status === "CONNECTED";

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">WhatsApp Session</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Kelola koneksi WhatsApp (Baileys) yang dipakai dispatch worker untuk mengirim pesan.
          </p>
        </div>
        <button
          onClick={handleReset}
          disabled={resetting}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-sm font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50 transition-colors"
        >
          <Power size={16} />
          {resetting ? "Mereset..." : "Reset Sesi"}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-sm">
          Gagal memuat status sesi: {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="rounded-xl border border-[var(--neutral-border)] bg-[var(--neutral-surface)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <MessageSquare size={20} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-semibold text-[var(--text-primary)]">Status Koneksi</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Status</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_STYLE[session.status] || STATUS_STYLE.DISCONNECTED}`}>
                {isConnected ? <Wifi size={12} /> : <WifiOff size={12} />}
                {STATUS_LABEL[session.status] || session.status}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Provider</span>
              <span className="text-sm font-mono text-[var(--text-primary)]">Baileys (WhatsApp Web)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-[var(--text-secondary)]">Auto-refresh</span>
              <span className="text-xs text-[var(--text-muted)]">setiap 5 detik</span>
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-[var(--neutral-border)]">
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Sesi ini dipakai oleh dispatch-service untuk seluruh pengiriman WhatsApp production.
              Jika status terputus, gunakan tombol <strong>Reset Sesi</strong> lalu scan ulang QR
              dari WhatsApp &rarr; Linked Devices.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-[var(--neutral-border)] bg-[var(--neutral-surface)] p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <QrCode size={20} className="text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="font-semibold text-[var(--text-primary)]">Pairing QR Code</h3>
          </div>
          <div className="flex flex-col items-center justify-center min-h-[280px]">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <RefreshCw size={16} className="animate-spin" />
                Memuat status...
              </div>
            ) : qrDataUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element -- QR data URL tidak perlu optimasi next/image */}
                <img src={qrDataUrl} alt="WhatsApp QR Code" className="rounded-lg border border-[var(--neutral-border)]" width={280} height={280} />
                <p className="mt-4 text-xs text-[var(--text-secondary)] text-center max-w-xs">
                  Buka WhatsApp di HP &rarr; <strong>Settings &rarr; Linked Devices &rarr; Link a Device</strong>, lalu scan QR code di atas.
                </p>
              </>
            ) : isConnected ? (
              <div className="flex flex-col items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Wifi size={40} />
                <p className="text-sm font-medium">Sesi aktif — tidak perlu scan QR</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                <QrCode size={40} />
                <p className="text-sm">QR belum tersedia. Tunggu koneksi atau reset sesi.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
