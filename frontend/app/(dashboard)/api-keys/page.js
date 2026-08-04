"use client";

import { useState } from "react";
import { useApiKeys } from "@/hooks/useApiKeys";
import {
  Key,
  Plus,
  Copy,
  Check,
  Search,
  AlertTriangle,
  Shield,
  Clock,
  Filter,
  X,
  Trash2,
  Lock,
} from "lucide-react";

export default function ApiKeysPage() {
  const { keys, loading, error, createKey, deactivateKey } = useApiKeys();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [modeFilter, setModeFilter] = useState("ALL"); // ALL | PRODUCTION | SANDBOX

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [labelInput, setLabelInput] = useState("");
  const [modeInput, setModeInput] = useState("PRODUCTION");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Secret Key Revealed modal state
  const [createdSecretKey, setCreatedSecretKey] = useState(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Confirm Deactivate modal state
  const [keyToDeactivate, setKeyToDeactivate] = useState(null);

  // Handle Create API Key submit
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!labelInput.trim()) return;

    setIsSubmitting(true);
    try {
      const result = await createKey(labelInput.trim(), modeInput);
      setIsCreateModalOpen(false);
      setLabelInput("");
      setModeInput("PRODUCTION");

      // Show secret key modal
      if (result && result.rawKey) {
        setCreatedSecretKey(result.rawKey);
      }
    } catch (err) {
      console.error("Gagal membuat API Key:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Copy Secret Key
  const handleCopySecret = () => {
    if (!createdSecretKey) return;
    navigator.clipboard.writeText(createdSecretKey);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  // Handle Deactivate Confirm
  const handleConfirmDeactivate = async () => {
    if (!keyToDeactivate) return;
    try {
      await deactivateKey(keyToDeactivate.id);
      setKeyToDeactivate(null);
    } catch (err) {
      console.error("Gagal menonaktifkan API Key:", err);
    }
  };

  // Filter keys
  const filteredKeys = keys.filter((key) => {
    const matchesSearch =
      (key.label || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (key.displayKey || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMode =
      modeFilter === "ALL" || key.mode === modeFilter;

    return matchesSearch && matchesMode;
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Kelola API Key</h1>
            <span className="px-2.5 py-0.5 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              DX Resend Standard
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gunakan API Key untuk autentikasi request dari aplikasi Anda ke Single Notification Gateway.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          <Plus className="w-4 h-4" />
          Buat API Key Baru
        </button>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-lg text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-gray-900 p-3 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari label atau key..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">Mode:</span>
          <div className="inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs font-medium">
            {["ALL", "PRODUCTION", "SANDBOX"].map((m) => (
              <button
                key={m}
                onClick={() => setModeFilter(m)}
                className={`px-3 py-1.5 rounded-md transition-all ${
                  modeFilter === m
                    ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs font-semibold"
                    : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                }`}
              >
                {m === "ALL" ? "Semua" : m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* API Key Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Label</th>
                <th className="px-6 py-3.5">API Key</th>
                <th className="px-6 py-3.5">Mode</th>
                <th className="px-6 py-3.5">Dibuat</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading && keys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span>Memuat daftar API Key...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 mb-3">
                        <Key className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Tidak Ada API Key</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 mb-4">
                        {searchTerm || modeFilter !== "ALL"
                          ? "Tidak ada API Key yang cocok dengan filter pencarian."
                          : "Buat API Key pertama Anda untuk mulai mengirim notifikasi."}
                      </p>
                      {!searchTerm && modeFilter === "ALL" && (
                        <button
                          onClick={() => setIsCreateModalOpen(true)}
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-colors"
                        >
                          Buat API Key Sekarang
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredKeys.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                  >
                    {/* Label */}
                    <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.isActive ? "bg-emerald-500" : "bg-gray-400"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                    </td>

                    {/* Masked Key */}
                    <td className="px-6 py-4 font-mono text-xs text-gray-600 dark:text-gray-300">
                      {item.displayKey}
                    </td>

                    {/* Mode Badge */}
                    <td className="px-6 py-4">
                      {item.mode === "SANDBOX" ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                          <Shield className="w-3 h-3" />
                          SANDBOX
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                          <Shield className="w-3 h-3" />
                          PRODUCTION
                        </span>
                      )}
                    </td>

                    {/* Date Created */}
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        {new Date(item.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">
                      {item.isActive ? (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300">
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          Nonaktif
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      {item.isActive ? (
                        <button
                          onClick={() => setKeyToDeactivate(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors"
                          title="Nonaktifkan API Key"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Nonaktifkan
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No action</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Form Buat API Key */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Buat API Key Baru</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Nama / Label API Key
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Backend Utama Production"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Mode Operasi API Key
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setModeInput("PRODUCTION")}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      modeInput === "PRODUCTION"
                        ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20"
                        : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between w-full">
                      <span>PRODUCTION</span>
                      {modeInput === "PRODUCTION" && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      Prefiks <code className="font-mono">ngw_prod_</code> untuk pengiriman sungguhan.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModeInput("SANDBOX")}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      modeInput === "SANDBOX"
                        ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20"
                        : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-semibold text-xs flex items-center justify-between w-full">
                      <span>SANDBOX</span>
                      {modeInput === "SANDBOX" && <Check className="w-3.5 h-3.5 text-amber-600" />}
                    </div>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                      Prefiks <code className="font-mono">ngw_sand_</code> untuk pengujian aman (mock).
                    </p>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !labelInput.trim()}
                  className="px-4 py-2 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Membuat...
                    </>
                  ) : (
                    "Buat Key Sekarang"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Secret Key Revealed (1x Tampil Standar Resend) */}
      {createdSecretKey && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100 dark:border-gray-800">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Simpan API Key Anda</h3>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Kunci ini HANYA ditampilkan 1 kali saja!
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  Demi alasan keamanan, kami tidak menyimpan kunci mentah ini di database (hanya hash bcrypt).
                  Jika Anda kehilangan kunci ini, Anda harus membuat API Key baru.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  API Key Mentah (Secret Key)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    readOnly
                    value={createdSecretKey}
                    className="w-full pl-3.5 pr-24 py-2.5 text-xs font-mono bg-gray-900 text-emerald-400 border border-gray-800 rounded-xl focus:outline-none"
                  />
                  <button
                    onClick={handleCopySecret}
                    className="absolute right-2 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    {copiedSecret ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Disalin!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Salin
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <button
                  onClick={() => setCreatedSecretKey(null)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gray-900 hover:bg-black dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 font-semibold text-xs rounded-xl transition-colors shadow-sm"
                >
                  Saya Sudah Menyimpan Key Ini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Konfirmasi Deactivate Key */}
      {keyToDeactivate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl max-w-sm w-full p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Nonaktifkan API Key?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 mt-3">
              API Key dengan label <span className="font-semibold text-gray-900 dark:text-white">"{keyToDeactivate.label}"</span> akan ditolak oleh sistem untuk semua request selanjutnya.
            </p>

            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                onClick={() => setKeyToDeactivate(null)}
                className="px-3.5 py-2 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeactivate}
                className="px-3.5 py-2 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Ya, Nonaktifkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
