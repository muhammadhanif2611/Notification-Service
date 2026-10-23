"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, Eye, MessageSquare, RefreshCw, Search, Users, UserCheck, UserX } from "lucide-react";
import DataTable from "@/components/shared/DataTable";
import MetricCard from "@/components/shared/MetricCard";
import Modal from "@/components/shared/Modal";
import StatusBadge from "@/components/shared/StatusBadge";
import { useAdminResource } from "@/hooks/useAdminResource";
import { apiPut } from "@/lib/api";
import { useToast } from "@/lib/toast-context";

const inputClass = "rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] px-3 py-2 text-sm text-[var(--text-primary)]";
const dateLabel = (value) => value ? new Date(value).toLocaleString("id-ID") : "Belum ada aktivitas";
const countLabel = (value) => Number(value || 0).toLocaleString("id-ID");

function ClientDetails({ clientId }) {
  const { data: client, loading, error } = useAdminResource(`/v1/admin/clients/${clientId}`);
  if (loading) return <p className="py-8 text-center text-sm text-[var(--text-muted)]">Memuat detail client...</p>;
  if (error) return <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  if (!client) return null;
  return <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{client.name}</h3><p className="break-all text-sm text-[var(--text-secondary)]">{client.email}</p></div><StatusBadge status={client.is_active ? "ACTIVE" : "INACTIVE"} /></div>
    <div className="grid gap-3 sm:grid-cols-2">
      {[['Login terakhir', dateLabel(client.last_login_at)], ['Penggunaan API terakhir', dateLabel(client.last_api_use_at)], ['Pesan terkirim', countLabel(client.successful_messages)], ['Pesan gagal', countLabel(client.failed_messages)]].map(([label, value]) => <div key={label} className="rounded-lg border border-[var(--neutral-border)] p-3"><p className="text-xs text-[var(--text-muted)]">{label}</p><p className="mt-1 text-sm font-medium">{value}</p></div>)}
    </div>
    <div><h4 className="mb-3 text-sm font-semibold">Project Client ({client.projects?.length || 0})</h4>
      {!client.projects?.length ? <p className="text-sm text-[var(--text-muted)]">Client belum memiliki project.</p> : <div className="space-y-3">{client.projects.map((project) => <div key={project.id} className="rounded-lg border border-[var(--neutral-border)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{project.name}</p><code className="text-xs text-[var(--text-muted)]">{project.slug}</code></div><StatusBadge status={project.is_active ? "ACTIVE" : "INACTIVE"} /></div>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
          {[['Pesan hari ini', countLabel(project.messages_today)], ['Kuota harian', countLabel(project.daily_quota)], ['Rate limit/menit', countLabel(project.rate_limit_per_min)], ['API key aktif', countLabel(project.active_keys)], ['Total template', countLabel(project.total_templates)], ['Total pesan', countLabel(project.total_messages)]].map(([label, value]) => <div key={label}><dt className="text-[var(--text-muted)]">{label}</dt><dd className="mt-1 font-mono font-semibold">{value}</dd></div>)}
        </dl><p className="mt-3 text-xs text-[var(--text-muted)]">API terakhir: {dateLabel(project.last_api_use_at)}</p>
      </div>)}</div>}
    </div>
    <div className="border-t border-[var(--neutral-border)] pt-3 text-sm"><Link href="/admin/projects" className="underline">Kelola project dan kuota</Link></div>
  </div>;
}

export default function ClientMonitoringPage() {
  const [filters, setFilters] = useState({ page: 1, limit: 25, search: "", status: "all", usage: "all" });
  const [search, setSearch] = useState("");
  const query = new URLSearchParams(Object.entries(filters).map(([key, value]) => [key, String(value)])).toString();
  const { data, loading, error, refresh } = useAdminResource(`/v1/admin/clients?${query}`);
  const [selected, setSelected] = useState(null);
  const [changing, setChanging] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState(null);
  const toast = useToast();
  const clients = data?.clients || [];
  const summary = data?.summary || {};
  const pages = Math.max(1, Math.ceil((data?.total || 0) / filters.limit));
  const updateFilter = (key, value) => setFilters((previous) => ({ ...previous, [key]: value, page: 1 }));
  const changeStatus = async () => {
    if (saving) return;
    setSaving(true); setActionError(null);
    try {
      await apiPut(`/v1/auth/users/${changing.id}/status`, { is_active: !changing.is_active });
      toast.success(changing.is_active ? "Akun client dinonaktifkan." : "Akun client diaktifkan.");
      setChanging(null); refresh();
    } catch (failure) { setActionError(failure.message); }
    finally { setSaving(false); }
  };
  const columns = [
    { key: "name", label: "Client", render: (_, client) => <div><p className="font-medium">{client.name}</p><p className="mt-1 text-xs text-[var(--text-muted)]">{client.email}</p></div> },
    { key: "is_active", label: "Akun", render: (value) => <StatusBadge status={value ? "ACTIVE" : "INACTIVE"} /> },
    { key: "total_projects", label: "Project", render: (value, client) => <div className="text-xs"><p>{countLabel(value)} project</p><p className="text-[var(--text-muted)]">{countLabel(client.active_projects)} aktif</p></div> },
    { key: "has_api_activity", label: "Integrasi API", render: (value, client) => <div><p className={value ? "text-xs text-emerald-600 dark:text-emerald-400" : "text-xs text-[var(--text-muted)]"}>{value ? "Sudah digunakan" : "Belum ada penggunaan"}</p><p className="mt-1 text-xs">{countLabel(client.active_keys)} key aktif</p></div> },
    { key: "messages_today", label: "Pesan Hari Ini", render: (value, client) => <div className="text-xs"><p className="font-mono font-semibold">{countLabel(value)}</p><p className="text-[var(--text-muted)]">Total: {countLabel(client.total_messages)}</p></div> },
    { key: "last_api_use_at", label: "Aktivitas Terakhir", render: (value, client) => <div className="text-xs"><p>API: {dateLabel(value)}</p><p className="mt-1 text-[var(--text-muted)]">Login: {dateLabel(client.last_login_at)}</p></div> },
    { key: "id", label: "Kontrol", render: (_, client) => <div className="flex gap-1"><button type="button" title="Lihat detail client" onClick={() => setSelected(client)} className="rounded-md p-2 hover:bg-[var(--neutral-bg)]"><Eye size={16} /></button><button type="button" title={client.is_active ? "Nonaktifkan akun client" : "Aktifkan akun client"} onClick={() => { setChanging(client); setActionError(null); }} className={`rounded-md p-2 hover:bg-[var(--neutral-bg)] ${client.is_active ? "text-red-500" : "text-emerald-600"}`}>{client.is_active ? <UserX size={16} /> : <UserCheck size={16} />}</button></div> },
  ];

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-semibold">Monitoring Client</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Pantau client berdasarkan login, penggunaan API, dan pengiriman pesan.</p></div><button type="button" onClick={refresh} disabled={loading} className={`${inputClass} inline-flex items-center gap-2 disabled:opacity-50`}><RefreshCw size={15} className={loading ? "animate-spin" : ""} />Refresh</button></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["Total Client", summary.total_clients, Users], ["Akun Aktif", summary.active_clients, UserCheck], ["Menggunakan API", summary.integrated_clients, Activity], ["Pesan Hari Ini (WIB)", summary.messages_today, MessageSquare]].map(([label, value, Icon]) => <MetricCard key={label} label={label} value={loading ? "..." : countLabel(value)} icon={<Icon size={16} />} />)}</div>
    <form onSubmit={(event) => { event.preventDefault(); updateFilter("search", search.trim()); }} className="flex flex-wrap gap-3">
      <div className="relative min-w-0 flex-1"><Search size={15} className="absolute left-3 top-3 text-[var(--text-muted)]" /><input aria-label="Cari client" placeholder="Cari nama atau email client..." value={search} onChange={(event) => setSearch(event.target.value)} className={`${inputClass} w-full pl-9`} /></div><button type="submit" className={inputClass}>Cari</button>
      <select aria-label="Filter status akun" value={filters.status} onChange={(event) => updateFilter("status", event.target.value)} className={inputClass}><option value="all">Semua Akun</option><option value="active">Aktif</option><option value="suspended">Nonaktif</option></select>
      <select aria-label="Filter penggunaan API" value={filters.usage} onChange={(event) => updateFilter("usage", event.target.value)} className={inputClass}><option value="all">Semua Integrasi</option><option value="used">Sudah Menggunakan API</option><option value="unused">Belum Menggunakan API</option></select>
    </form>
    {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    {loading ? <p className="py-10 text-center text-sm text-[var(--text-muted)]">Memuat client...</p> : <DataTable columns={columns} data={clients} emptyTitle="Tidak ada client" emptyDescription="Client yang terdaftar akan muncul di sini. Coba ubah filter pencarian." />}
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm"><span className="text-[var(--text-muted)]">{countLabel(data?.total)} client sesuai filter · Halaman {filters.page} dari {pages}</span><div className="flex gap-2"><button type="button" disabled={loading || filters.page <= 1} onClick={() => setFilters((previous) => ({ ...previous, page: previous.page - 1 }))} className={`${inputClass} disabled:opacity-50`}>Sebelumnya</button><button type="button" disabled={loading || filters.page >= pages} onClick={() => setFilters((previous) => ({ ...previous, page: previous.page + 1 }))} className={`${inputClass} disabled:opacity-50`}>Berikutnya</button></div></div>
    <Modal isOpen={Boolean(selected)} onClose={() => setSelected(null)} title="Detail Penggunaan Client" maxWidth="max-w-3xl">{selected && <ClientDetails clientId={selected.id} />}</Modal>
    <Modal isOpen={Boolean(changing)} onClose={() => { if (!saving) setChanging(null); }} title={changing?.is_active ? "Nonaktifkan Akun Client?" : "Aktifkan Akun Client?"}>
      {changing && <div className="space-y-4"><p className="break-words text-sm">{changing.name} ({changing.email})</p><p className="text-sm text-[var(--text-secondary)]">{changing.is_active ? "Akses login, sesi dashboard, dan API client akan ditolak sampai akun diaktifkan kembali. Data project dan pesan tetap tersimpan." : "Client dapat mengakses kembali project yang masih aktif menggunakan akun dan API key yang berlaku."}</p>{actionError && <p role="alert" className="text-sm text-red-600">{actionError}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setChanging(null)} disabled={saving} className={inputClass}>Batal</button><button type="button" onClick={changeStatus} disabled={saving} className={`rounded-lg px-4 py-2 text-sm text-white disabled:opacity-50 ${changing.is_active ? "bg-red-600" : "bg-emerald-600"}`}>{saving ? "Menyimpan..." : changing.is_active ? "Nonaktifkan Akun" : "Aktifkan Akun"}</button></div></div>}
    </Modal>
  </div>;
}
