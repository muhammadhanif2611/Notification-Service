"use client";

import { useState, useEffect } from "react";
import {
  FolderKanban,
  Search,
  RefreshCw,
  KeyRound,
  User,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sliders,
  Check,
  Copy,
  Shield,
  Send,
  Eye,
  X
} from "lucide-react";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import MetricCard from "@/components/shared/MetricCard";
import Modal from "@/components/shared/Modal";
import Alert from "@/components/shared/Alert";

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("ALL"); // ALL | PENDING | ACTIVE

  // Approve modal state
  const [approvingProject, setApprovingProject] = useState(null);
  const [approveForm, setApproveForm] = useState({
    dailyQuota: 5000,
    rateLimitPerMin: 100,
    environment: "production"
  });
  const [approveSubmitting, setApproveSubmitting] = useState(false);
  const [approveResult, setApproveResult] = useState(null);
  const [copiedEnv, setCopiedEnv] = useState(false);

  // Edit quota modal state
  const [editingProject, setEditingProject] = useState(null);
  const [editForm, setEditForm] = useState({ daily_quota: 5000, rate_limit_per_min: 100, is_active: true });
  const [editSaving, setEditSaving] = useState(false);
  const [modalError, setModalError] = useState(null);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await apiGet("/v1/clients/projects");
      setProjects(res?.data || []);
    } catch (err) {
      console.error("Gagal memuat projects:", err);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Evaluasi status koneksi & approval
  const getProjectStatus = (p) => {
    if (!p.is_active) {
      return {
        type: "PENDING",
        label: "Menunggu Persetujuan",
        badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40",
        icon: Clock
      };
    }

    const keys = p.api_keys || [];
    const lastUsedKey = keys
      .filter((k) => k.last_used_at)
      .sort((a, b) => new Date(b.last_used_at) - new Date(a.last_used_at))[0];

    if (lastUsedKey?.last_used_at) {
      return {
        type: "CONNECTED",
        label: "Terhubung (SDK Aktif)",
        lastHit: lastUsedKey.last_used_at,
        badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40",
        icon: CheckCircle2
      };
    }

    return {
      type: "APPROVED_WAITING",
      label: "Disetujui (Menunggu Hit SDK)",
      keyCount: keys.length,
      badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40",
      icon: Activity
    };
  };

  // Open approve modal
  const handleOpenApprove = (p) => {
    setApprovingProject(p);
    setApproveForm({
      dailyQuota: p.daily_quota || 5000,
      rateLimitPerMin: p.rate_limit_per_min || 100,
      environment: "production"
    });
    setApproveResult(null);
    setCopiedEnv(false);
    setModalError(null);
  };

  // Execute approval (Model 2: Approve & Auto-generate API Key)
  const handleConfirmApprove = async (e) => {
    e.preventDefault();
    setApproveSubmitting(true);
    setModalError(null);
    try {
      const res = await apiPost(`/v1/clients/projects/${approvingProject.id}/approve`, {
        dailyQuota: Number(approveForm.dailyQuota),
        rateLimitPerMin: Number(approveForm.rateLimitPerMin),
        environment: approveForm.environment
      });
      setApproveResult(res?.data || {});
      await fetchProjects();
    } catch (err) {
      setModalError(err.message || "Gagal menyetujui proyek.");
    } finally {
      setApproveSubmitting(false);
    }
  };

  const handleOpenEdit = (p) => {
    setEditingProject(p);
    setEditForm({
      daily_quota: p.daily_quota || 5000,
      rate_limit_per_min: p.rate_limit_per_min || 100,
      is_active: p.is_active ?? true
    });
    setModalError(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    setModalError(null);
    try {
      await apiPut(`/v1/clients/projects/${editingProject.id}`, {
        dailyQuota: Number(editForm.daily_quota),
        rateLimitPerMin: Number(editForm.rate_limit_per_min),
        isActive: editForm.is_active
      });
      setEditingProject(null);
      await fetchProjects();
    } catch (err) {
      setModalError(err.message || "Gagal memperbarui proyek.");
    } finally {
      setEditSaving(false);
    }
  };

  const pendingProjects = projects.filter((p) => !p.is_active);
  const activeProjects = projects.filter((p) => p.is_active);
  const connectedProjects = projects.filter((p) => {
    const s = getProjectStatus(p);
    return s.type === "CONNECTED";
  });

  const filteredProjects = projects.filter((p) => {
    const s = getProjectStatus(p);
    const matchesTab =
      activeTab === "ALL" ||
      (activeTab === "PENDING" && !p.is_active) ||
      (activeTab === "ACTIVE" && p.is_active);

    const matchesSearch =
      p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.profiles?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[var(--neutral-border)]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Katalog & Persetujuan Proyek Klien</h1>
            {pendingProjects.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 animate-pulse">
                {pendingProjects.length} Menunggu Persetujuan
              </span>
            )}
          </div>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Tinjau permohonan akses dari klien, terbitkan kredensial API Key resmi, dan pantau telemetry hit pertama SDK.
          </p>
        </div>
        <button
          onClick={fetchProjects}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          icon={<FolderKanban size={16} />}
          label="Total Proyek Klien"
          value={loading ? "..." : projects.length}
          subtitle="Terdaftar di sistem"
        />
        <MetricCard
          icon={<Clock size={16} className="text-amber-500" />}
          label="Menunggu Persetujuan"
          value={loading ? "..." : pendingProjects.length}
          subtitle="Memerlukan tindakan admin"
          trend={pendingProjects.length > 0 ? "Perlu Review" : "Semua Selesai"}
          trendDirection={pendingProjects.length > 0 ? "neutral" : "up"}
        />
        <MetricCard
          icon={<CheckCircle2 size={16} className="text-emerald-500" />}
          label="SDK Aktif / Terhubung"
          value={loading ? "..." : connectedProjects.length}
          subtitle={`${activeProjects.length} disetujui · ${connectedProjects.length} pernah hit`}
        />
      </div>

      {/* Search & Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[var(--neutral-surface)] p-3 rounded-xl border border-[var(--neutral-border)] shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Cari proyek, slug, atau email client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-[var(--neutral-bg)] border border-[var(--neutral-border)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]"
          />
        </div>

        {/* Tab Filter */}
        <div className="flex items-center gap-1.5 p-1 bg-[var(--neutral-bg)] rounded-lg text-xs font-medium border border-[var(--neutral-border)] w-full sm:w-auto">
          {[
            { id: "ALL", label: `Semua (${projects.length})` },
            { id: "PENDING", label: `🟡 Pengajuan Baru (${pendingProjects.length})` },
            { id: "ACTIVE", label: `🟢 Disetujui & Aktif (${activeProjects.length})` }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                activeTab === t.id
                  ? "bg-[var(--neutral-surface)] text-[var(--text-primary)] shadow-xs font-semibold"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--neutral-surface)] rounded-xl border border-[var(--neutral-border)] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--neutral-bg)] text-[var(--text-secondary)] border-b border-[var(--neutral-border)] text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Proyek Klien</th>
                <th className="px-6 py-3.5">Pemohon (Client)</th>
                <th className="px-6 py-3.5">Status & Telemetry SDK</th>
                <th className="px-6 py-3.5">API Keys</th>
                <th className="px-6 py-3.5">Alokasi Kuota</th>
                <th className="px-6 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--neutral-border)]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--text-muted)]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
                      <span>Memuat data proyek...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="max-w-sm mx-auto flex flex-col items-center text-center">
                      <FolderKanban className="w-10 h-10 text-[var(--text-muted)] mb-3" />
                      <p className="text-sm font-semibold text-[var(--text-primary)]">Tidak ada proyek dalam kategori ini</p>
                      <p className="text-xs text-[var(--text-secondary)] mt-1">
                        {searchTerm ? "Coba kata kunci pencarian yang lain." : "Belum ada pengajuan proyek pada filter ini."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProjects.map((p) => {
                  const status = getProjectStatus(p);
                  return (
                    <tr key={p.id} className="hover:bg-[var(--neutral-bg)] transition-colors">
                      {/* Nama & Deskripsi */}
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${p.is_active ? "bg-[var(--primary)]/10 text-[var(--text-primary)]" : "bg-amber-100 text-amber-700 dark:bg-amber-950/50"}`}>
                            <FolderKanban size={15} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[var(--text-primary)]">{p.name}</span>
                              <span className="text-[11px] font-mono text-[var(--text-muted)]">({p.slug})</span>
                            </div>
                            {p.description && (
                              <p className="text-xs text-[var(--text-secondary)] mt-1 line-clamp-2 max-w-md">
                                {p.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Pemohon */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User size={13} className="text-[var(--text-muted)]" />
                          <div>
                            <p className="text-xs font-medium text-[var(--text-primary)]">
                              {p.profiles?.name || "Klien"}
                            </p>
                            <p className="text-[11px] text-[var(--text-muted)]">
                              {p.profiles?.email || "-"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status & Telemetry */}
                      <td className="px-6 py-4">
                        <div>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md ${status.badgeClass}`}>
                            <status.icon size={13} />
                            {status.label}
                          </span>
                          {status.lastHit && (
                            <p className="text-[10px] text-[var(--text-muted)] mt-1">
                              Hit pertama/terakhir: {new Date(status.lastHit).toLocaleString("id-ID", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* API Keys */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {(p.api_keys || []).slice(0, 2).map((k) => (
                            <div key={k.id} className="flex items-center gap-1 text-[11px] font-mono text-[var(--text-secondary)]">
                              <KeyRound size={11} className="text-[var(--text-muted)]" />
                              <span>{k.key_prefix}••••{k.key_preview}</span>
                            </div>
                          ))}
                          {(p.api_keys || []).length === 0 && (
                            <span className="text-xs text-[var(--text-muted)]">Belum terbit</span>
                          )}
                        </div>
                      </td>

                      {/* Kuota */}
                      <td className="px-6 py-4 text-xs">
                        <p className="font-semibold text-[var(--text-primary)]">
                          {(p.daily_quota || 5000).toLocaleString("id-ID")} <span className="font-normal text-[var(--text-muted)]">pesan/hari</span>
                        </p>
                        <p className="text-[11px] text-[var(--text-muted)]">
                          {p.rate_limit_per_min || 100} req/menit
                        </p>
                      </td>

                      {/* Aksi */}
                      <td className="px-6 py-4 text-right">
                        {!p.is_active ? (
                          <button
                            onClick={() => handleOpenApprove(p)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors shadow-xs"
                          >
                            <Check size={13} />
                            Tinjau & Setujui
                          </button>
                        ) : (
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--neutral-bg)] transition-colors"
                          >
                            <Sliders size={13} />
                            Kelola Kuota
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Tinjau & Setujui Pengajuan Proyek */}
      <Modal
        isOpen={!!approvingProject}
        onClose={() => setApprovingProject(null)}
        title={approveResult ? "Proyek Berhasil Disetujui!" : `Persetujuan Proyek: ${approvingProject?.name || ""}`}
        maxWidth="max-w-lg"
      >
        {approveResult ? (
          /* Tampilan Sukses & Kredensial Onboarding */
          <div className="space-y-4">
            <Alert variant="success" title="Kredensial Resmi Telah Diterbitkan">
              Proyek ini sekarang aktif. Bagikan konfigurasi di bawah ke developer klien untuk dipasang ke file <code className="font-mono">.env</code> aplikasi mereka.
            </Alert>

            {approveResult.rawApiKey ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">
                    API Key Klien (Hanya Tampil 1 Kali)
                  </label>
                  <code className="block p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-emerald-600 dark:text-emerald-400 break-all select-all">
                    {approveResult.rawApiKey}
                  </code>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-[var(--text-secondary)]">
                      Paket Konfigurasi .env Siap Salin
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const envSnippet = `NGW_API_KEY=${approveResult.rawApiKey}\nNGW_BASE_URL=http://localhost:3001`;
                        navigator.clipboard.writeText(envSnippet);
                        setCopiedEnv(true);
                        setTimeout(() => setCopiedEnv(false), 2000);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      {copiedEnv ? <><Check size={12} className="text-emerald-500" /> Disalin!</> : <><Copy size={12} /> Salin .env</>}
                    </button>
                  </div>
                  <pre className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-mono text-[var(--text-primary)]">
{`NGW_API_KEY=${approveResult.rawApiKey}
NGW_BASE_URL=http://localhost:3001`}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="text-xs text-[var(--text-secondary)]">
                Proyek telah diaktifkan dengan API Key yang sudah ada sebelumnya.
              </p>
            )}

            <div className="pt-4 border-t border-[var(--neutral-border)] flex justify-end">
              <button
                type="button"
                onClick={() => setApprovingProject(null)}
                className="px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] rounded-lg text-xs font-semibold"
              >
                Selesai & Tutup
              </button>
            </div>
          </div>
        ) : (
          /* Form Persetujuan Kuota */
          <form onSubmit={handleConfirmApprove} className="space-y-4">
            {modalError && <Alert variant="error">{modalError}</Alert>}

            {/* Info pengajuan klien */}
            <div className="p-3.5 rounded-lg bg-[var(--neutral-bg)] border border-[var(--neutral-border)] space-y-1.5 text-xs">
              <p className="text-[var(--text-muted)]">Pemohon: <span className="font-semibold text-[var(--text-primary)]">{approvingProject?.profiles?.name} ({approvingProject?.profiles?.email})</span></p>
              <p className="text-[var(--text-muted)]">Slug Proyek: <span className="font-mono text-[var(--text-primary)]">{approvingProject?.slug}</span></p>
              {approvingProject?.description && (
                <p className="text-[var(--text-muted)] pt-1 border-t border-[var(--neutral-border)]">
                  Kebutuhan Notifikasi: <span className="text-[var(--text-secondary)] italic">{approvingProject.description}</span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Alokasi Kuota Harian (Pesan / Hari)
              </label>
              <input
                type="number"
                required
                min={100}
                value={approveForm.dailyQuota}
                onChange={(e) => setApproveForm({ ...approveForm, dailyQuota: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[var(--neutral-bg)] border border-[var(--neutral-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Rate Limit (Request / Menit)
              </label>
              <input
                type="number"
                required
                min={10}
                value={approveForm.rateLimitPerMin}
                onChange={(e) => setApproveForm({ ...approveForm, rateLimitPerMin: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-[var(--neutral-bg)] border border-[var(--neutral-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
                Mode Kunci Akses Awal
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setApproveForm({ ...approveForm, environment: "production" })}
                  className={`p-3 rounded-lg border text-left text-xs transition-colors ${
                    approveForm.environment === "production"
                      ? "border-[var(--primary)] bg-[var(--primary)]/5 font-semibold text-[var(--text-primary)]"
                      : "border-[var(--neutral-border)] text-[var(--text-secondary)]"
                  }`}
                >
                  <p className="font-semibold text-[var(--text-primary)]">Production</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Prefix ngw_prod_</p>
                </button>
                <button
                  type="button"
                  onClick={() => setApproveForm({ ...approveForm, environment: "sandbox" })}
                  className={`p-3 rounded-lg border text-left text-xs transition-colors ${
                    approveForm.environment === "sandbox"
                      ? "border-[var(--primary)] bg-[var(--primary)]/5 font-semibold text-[var(--text-primary)]"
                      : "border-[var(--neutral-border)] text-[var(--text-secondary)]"
                  }`}
                >
                  <p className="font-semibold text-[var(--text-primary)]">Sandbox</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Prefix ngw_sand_</p>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--neutral-border)]">
              <button
                type="button"
                onClick={() => setApprovingProject(null)}
                className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--neutral-bg)] rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={approveSubmitting}
                className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {approveSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Setujui & Terbitkan API Key
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Kelola Kuota (Proyek Aktif) */}
      <Modal
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        title={`Kelola Kuota: ${editingProject?.name || ""}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveEdit} className="space-y-4">
          {modalError && <Alert variant="error">{modalError}</Alert>}

          <div className="p-3 rounded-lg bg-[var(--neutral-bg)] border border-[var(--neutral-border)] space-y-1">
            <p className="text-xs text-[var(--text-muted)]">Slug: <span className="font-mono text-[var(--text-primary)]">{editingProject?.slug}</span></p>
            <p className="text-xs text-[var(--text-muted)]">Pemilik: <span className="text-[var(--text-primary)]">{editingProject?.profiles?.email || "-"}</span></p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Kuota Harian (Pesan / Hari)
            </label>
            <input
              type="number"
              required
              min={100}
              value={editForm.daily_quota}
              onChange={(e) => setEditForm({ ...editForm, daily_quota: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[var(--neutral-bg)] border border-[var(--neutral-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">
              Rate Limit (Request / Menit)
            </label>
            <input
              type="number"
              required
              min={10}
              value={editForm.rate_limit_per_min}
              onChange={(e) => setEditForm({ ...editForm, rate_limit_per_min: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-[var(--neutral-bg)] border border-[var(--neutral-border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--primary)]"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active_edit"
              checked={editForm.is_active}
              onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
              className="w-4 h-4 rounded border-[var(--neutral-border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <label htmlFor="is_active_edit" className="text-xs font-medium text-[var(--text-primary)]">
              Proyek Aktif (Bisa mengirim pesan)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[var(--neutral-border)]">
            <button
              type="button"
              onClick={() => setEditingProject(null)}
              className="px-4 py-2 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--neutral-bg)] rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="px-4 py-2 text-xs font-semibold bg-[var(--primary)] text-[var(--on-primary)] hover:bg-[var(--primary-hover)] rounded-lg transition-colors disabled:opacity-50"
            >
              {editSaving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
