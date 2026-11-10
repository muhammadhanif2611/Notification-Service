"use client";

import { useState } from "react";
import { FileText, Plus, Copy, Check, Pencil, Trash2, RefreshCw, BookOpen, Code2, Sparkles } from "lucide-react";
import DataTable from "@/components/shared/DataTable";
import Modal from "@/components/shared/Modal";
import { useProjectContext } from "@/lib/project-context";
import { useTemplates } from "@/hooks/useTemplates";
import { useToast } from "@/lib/toast-context";

const TEMPLATE_PRESETS = {
  WHATSAPP: [
    {
      label: "Contoh OTP",
      name: "Verifikasi OTP",
      code: "otp_login",
      variables: "nama, otp, berlaku_menit",
      subject: "",
      body: "Halo *{{nama}}*, kode verifikasi (OTP) Anda adalah *{{otp}}*.\n\nKode ini berlaku selama {{berlaku_menit}} menit. Jangan berikan kode ini kepada siapa pun.",
    },
    {
      label: "Contoh Tagihan",
      name: "Pengingat Tagihan",
      code: "invoice_reminder",
      variables: "nama, nomor_invoice, nominal, jatuh_tempo",
      subject: "",
      body: "Yth. *{{nama}}*,\n\nTagihan Anda dengan nomor *{{nomor_invoice}}* sebesar *Rp {{nominal}}* akan jatuh tempo pada *{{jatuh_tempo}}*.\nTerima kasih.",
    },
  ],
  EMAIL: [
    {
      label: "Contoh OTP Email",
      name: "Verifikasi OTP Email",
      code: "email_otp",
      variables: "nama, otp, berlaku_menit",
      subject: "Kode Verifikasi OTP Anda",
      body: "Halo {{nama}},\n\nBerikut adalah kode verifikasi akun Anda: {{otp}}\nKode ini berlaku selama {{berlaku_menit}} menit.\n\nAbaikan pesan ini jika Anda tidak merasa melakukan permintaan login.",
    },
    {
      label: "Contoh Pengumuman",
      name: "Pengumuman Layanan",
      code: "service_announcement",
      variables: "nama, tanggal, jadwal",
      subject: "Informasi Pemeliharaan Sistem",
      body: "Halo {{nama}},\n\nKami informasikan bahwa akan dilakukan pemeliharaan sistem pada {{tanggal}} pukul {{jadwal}}.\n\nTerima kasih atas pengertian Anda.",
    },
  ],
};

const SAMPLE_VAR_VALUES = {
  nama: "Budi Santoso",
  otp: "482910",
  berlaku_menit: "5",
  nomor_invoice: "INV-2026-001",
  nominal: "250.000",
  jatuh_tempo: "20 November 2026",
  tanggal: "Sabtu, 15 November 2026",
  jadwal: "22:00 - 23:30 WIB",
};

// Halaman manajemen Template Pesan Client beserta dokumentasi contoh pengisian pesan manual dan JSON payload.
export default function TemplatesPage() {
  const toast = useToast();
  const { activeProject } = useProjectContext();
  const projectId = activeProject?.id || null;
  const { templates, loading, error, createTemplate, updateTemplate, deleteTemplate, refetch } = useTemplates(projectId);

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [submissionWarning, setSubmissionWarning] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);
  const [docTab, setDocTab] = useState("manual");
  const [modalPreviewTab, setModalPreviewTab] = useState("preview");

  const emptyForm = { name: "", code: "", channel: "WHATSAPP", subject: "", body: "", variables: "" };
  const [form, setForm] = useState(emptyForm);

  const handleCopyText = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const parseVariables = () => {
    const manualVars = form.variables.split(",").map((v) => v.trim()).filter(Boolean);
    const bodyMatches = Array.from((form.body || "").matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)).map((m) => m[1]);
    return Array.from(new Set([...manualVars, ...bodyMatches]));
  };

  const handleBodyChange = (newBody) => {
    const detected = Array.from(newBody.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)).map((m) => m[1]);
    const currentVars = form.variables.split(",").map((v) => v.trim()).filter(Boolean);
    const merged = Array.from(new Set([...currentVars, ...detected]));
    setForm({
      ...form,
      body: newBody,
      variables: merged.join(", "),
    });
  };

  const applyPreset = (preset) => {
    setForm((prev) => ({
      ...prev,
      name: prev.name || preset.name,
      code: editing ? prev.code : preset.code,
      subject: preset.subject,
      body: preset.body,
      variables: preset.variables,
    }));
  };

  const activeVars = parseVariables();
  const sampleVariablesObject = Object.fromEntries(
    (activeVars.length > 0 ? activeVars : ["nama", "otp"]).map((v) => [v, SAMPLE_VAR_VALUES[v] || `contoh_${v}`])
  );

  const renderedPreviewBody = (form.body || "Halo {{nama}}, kode OTP Anda adalah {{otp}}.").replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_, key) => SAMPLE_VAR_VALUES[key] || `[${key}]`
  );

  const jsonTemplateExample = JSON.stringify(
    {
      channel: form.channel,
      recipient: form.channel === "WHATSAPP" ? "6281234567890" : "budi@example.com",
      templateCode: (form.code || "otp_verification").toLowerCase().trim(),
      variables: sampleVariablesObject,
    },
    null,
    2
  );

  const jsonManualExample = JSON.stringify(
    {
      channel: form.channel,
      recipient: form.channel === "WHATSAPP" ? "6281234567890" : "budi@example.com",
      ...(form.channel === "EMAIL" ? { subject: form.subject || "Kode OTP Anda" } : {}),
      body: renderedPreviewBody,
    },
    null,
    2
  );

  const openCreate = () => {
    setForm(emptyForm);
    setSubmissionWarning(null);
    setModalPreviewTab("preview");
    setShowModal(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setModalPreviewTab("preview");
    setForm({
      name: t.name,
      code: t.code,
      channel: t.channel,
      subject: t.subject || "",
      body: t.body,
      variables: Array.isArray(t.variables) ? t.variables.join(", ") : "",
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving || submissionWarning) return;
    if (!projectId) {
      toast.warning("Pilih project terlebih dahulu dari sidebar.");
      return;
    }
    setSaving(true);
    try {
      await createTemplate({
        projectId,
        name: form.name,
        code: form.code.toLowerCase().trim(),
        channel: form.channel,
        subject: form.channel === "EMAIL" ? form.subject : undefined,
        body: form.body,
        variables: parseVariables(),
      });
      setShowModal(false);
      setForm(emptyForm);
      toast.success("Template berhasil dibuat dan siap digunakan.");
    } catch (err) {
      if (err.outcomeUnknown) {
        setSubmissionWarning(err.message);
        toast.warning({ title: "Status Penyimpanan Belum Diketahui", message: err.message });
      } else {
        toast.error("Gagal membuat template: " + err.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateTemplate(editing.id, {
        name: form.name,
        subject: form.channel === "EMAIL" ? form.subject : null,
        body: form.body,
        variables: parseVariables(),
      });
      setEditing(null);
      toast.success("Template berhasil diperbarui dan siap digunakan.");
    } catch (err) {
      toast.error("Gagal mengedit template: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await deleteTemplate(deleting.id);
      setDeleting(null);
    } catch (err) {
      toast.error("Gagal menghapus template: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: "code",
      label: "Kode",
      mono: true,
      render: (val) => (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-mono text-xs">{val}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCopyText(val, val);
            }}
            className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            title="Salin kode template"
          >
            {copiedCode === val ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
          </button>
        </span>
      ),
    },
    { key: "name", label: "Nama", render: (val) => <span className="font-medium">{val}</span> },
    {
      key: "channel",
      label: "Channel",
      render: (val) => (
        <span
          className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase ${
            val === "WHATSAPP" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
          }`}
        >
          {val}
        </span>
      ),
    },
    {
      key: "variables",
      label: "Variabel",
      render: (val) => (
        <span className="text-xs font-mono text-[var(--text-secondary)]">
          {Array.isArray(val) && val.length > 0 ? val.map((v) => `{{${v}}}`).join(" ") : "—"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Aksi",
      render: (_, row) => (
        <span className="inline-flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openEdit(row);
            }}
            className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--neutral-bg)] transition-colors"
            title="Edit template"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleting(row);
            }}
            className="p-1.5 rounded-md text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            title="Hapus template"
          >
            <Trash2 size={14} />
          </button>
        </span>
      ),
    },
  ];

  const renderFormGuidance = () => (
    <div className="rounded-xl border border-[var(--neutral-border)] bg-[var(--neutral-bg)] p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[var(--text-primary)] inline-flex items-center gap-1.5">
          <Code2 size={14} className="text-[var(--primary)]" /> Panduan &amp; Contoh Format Pesan
        </span>
        <div className="inline-flex rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-surface)] p-0.5 text-[11px]">
          {[
            { id: "preview", label: "Pratinjau Manual" },
            { id: "json-template", label: "JSON (Template)" },
            { id: "json-manual", label: "JSON (Manual)" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setModalPreviewTab(tab.id)}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                modalPreviewTab === tab.id
                  ? "bg-[var(--primary)] text-[var(--on-primary)]"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {modalPreviewTab === "preview" && (
        <div className="space-y-2 text-xs">
          <p className="text-[11px] text-[var(--text-muted)]">
            Gunakan kurung kurawal ganda <code className="font-mono bg-[var(--neutral-surface)] px-1 rounded">{"{{nama_variabel}}"}</code> di dalam <strong>Isi Pesan</strong>. Saat dikirim, placeholder otomatis diganti dengan data penerima:
          </p>
          <div className="rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-surface)] p-3 space-y-1">
            {form.channel === "EMAIL" && (
              <p className="text-[11px] font-semibold text-[var(--text-primary)] border-b border-[var(--neutral-border)] pb-1.5 mb-1.5">
                Subject: {form.subject || "Kode Verifikasi OTP Anda"}
              </p>
            )}
            <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{renderedPreviewBody}</p>
          </div>
        </div>
      )}

      {modalPreviewTab === "json-template" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-[var(--text-muted)]">
              Contoh body request <code className="font-mono">POST /v1/notifications/send</code> menggunakan template ini:
            </p>
            <button
              type="button"
              onClick={() => handleCopyText(jsonTemplateExample, "modal-json-tpl")}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {copiedCode === "modal-json-tpl" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />} Salin JSON
            </button>
          </div>
          <pre className="text-[11px] font-mono bg-zinc-950 text-emerald-400 rounded-lg p-3 overflow-x-auto leading-relaxed">
            {jsonTemplateExample}
          </pre>
        </div>
      )}

      {modalPreviewTab === "json-manual" && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-[var(--text-muted)]">
              Contoh body request <code className="font-mono">POST /v1/notifications/send</code> secara manual (tanpa template):
            </p>
            <button
              type="button"
              onClick={() => handleCopyText(jsonManualExample, "modal-json-manual")}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              {copiedCode === "modal-json-manual" ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />} Salin JSON
            </button>
          </div>
          <pre className="text-[11px] font-mono bg-zinc-950 text-emerald-400 rounded-lg p-3 overflow-x-auto leading-relaxed">
            {jsonManualExample}
          </pre>
        </div>
      )}
    </div>
  );

  if (!activeProject) {
    return (
      <div className="py-16 text-center bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl">
        <FileText size={32} className="mx-auto text-[var(--text-muted)] mb-3" />
        <p className="text-sm font-medium text-[var(--text-primary)]">Belum ada project aktif</p>
        <p className="text-xs text-[var(--text-secondary)] mt-1">Buat atau pilih project terlebih dahulu di halaman Projects.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]">Template Pesan</h2>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            Template untuk project <span className="font-semibold text-[var(--text-primary)]">{activeProject.name}</span>. Template langsung dapat digunakan setelah disimpan.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--neutral-border)] px-3 py-2 text-xs disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors"
          >
            <Plus size={14} /> Buat Template
          </button>
        </div>
      </div>

      {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <DataTable
        columns={columns}
        data={templates}
        emptyTitle="Belum ada template"
        emptyDescription={loading ? "Memuat template..." : "Buat template pesan untuk project ini."}
      />

      <div className="bg-[var(--neutral-surface)] border border-[var(--neutral-border)] rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-[var(--primary)]" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Dokumentasi &amp; Contoh Pengisian Isi Pesan (Manual vs JSON)
              </h3>
              <p className="text-xs text-[var(--text-secondary)]">
                Panduan cara menulis isi pesan pada form template, pengiriman manual, maupun melalui payload JSON API.
              </p>
            </div>
          </div>
          <div className="inline-flex rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] p-1 text-xs">
            {[
              { id: "manual", label: "1. Isi Pesan Manual (Form)" },
              { id: "json-tpl", label: "2. JSON dengan Template" },
              { id: "json-raw", label: "3. JSON Pesan Manual" },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDocTab(t.id)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  docTab === t.id
                    ? "bg-[var(--neutral-surface)] text-[var(--text-primary)] shadow-xs"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {docTab === "manual" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-700 dark:text-emerald-400">Contoh Isi Pesan WhatsApp</span>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">Variabel: nama, otp, berlaku_menit</span>
              </div>
              <pre className="p-3 rounded-lg bg-[var(--neutral-surface)] border border-[var(--neutral-border)] font-mono text-[11px] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
{`Halo *{{nama}}*, kode OTP Anda adalah *{{otp}}*.

Kode ini berlaku selama {{berlaku_menit}} menit. Jangan bagikan kode ini kepada siapa pun.`}
              </pre>
              <p className="text-[11px] text-[var(--text-muted)]">
                Tips WhatsApp: Gunakan <code className="font-mono">*teks*</code> untuk huruf tebal dan <code className="font-mono">_teks_</code> untuk huruf miring.
              </p>
            </div>

            <div className="rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-blue-700 dark:text-blue-400">Contoh Isi Pesan Email</span>
                <span className="font-mono text-[11px] text-[var(--text-muted)]">Variabel: nama, nomor_invoice, nominal</span>
              </div>
              <pre className="p-3 rounded-lg bg-[var(--neutral-surface)] border border-[var(--neutral-border)] font-mono text-[11px] text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
{`Subject: Tagihan Layanan #{{nomor_invoice}}

Yth. {{nama}},
Tagihan Anda dengan nomor {{nomor_invoice}} sebesar Rp {{nominal}} telah diterbitkan. Terima kasih.`}
              </pre>
              <p className="text-[11px] text-[var(--text-muted)]">
                Tips Variabel: Setiap kata di dalam <code className="font-mono">{"{{...}}"}</code> otomatis terdaftar sebagai variabel dinamis.
              </p>
            </div>
          </div>
        )}

        {docTab === "json-tpl" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <p className="font-medium text-[var(--text-primary)]">
                Single Send menggunakan Template (<code className="font-mono">POST /v1/notifications/send</code>)
              </p>
              <pre className="p-3.5 rounded-lg bg-zinc-950 text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`{
  "channel": "WHATSAPP",
  "recipient": "6281234567890",
  "templateCode": "otp_login",
  "variables": {
    "nama": "Budi Santoso",
    "otp": "482910",
    "berlaku_menit": "5"
  }
}`}
              </pre>
            </div>
            <div className="space-y-1.5">
              <p className="font-medium text-[var(--text-primary)]">
                Broadcast menggunakan Template (<code className="font-mono">POST /v1/notifications/broadcast</code>)
              </p>
              <pre className="p-3.5 rounded-lg bg-zinc-950 text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`{
  "channel": "WHATSAPP",
  "recipients": ["6281234567890", "6289876543210"],
  "templateCode": "invoice_reminder",
  "variables": {
    "jatuh_tempo": "20 November 2026"
  },
  "recipientVariables": {
    "6281234567890": { "nama": "Budi", "nomor_invoice": "INV-01", "nominal": "150.000" },
    "6289876543210": { "nama": "Siti", "nomor_invoice": "INV-02", "nominal": "275.000" }
  }
}`}
              </pre>
            </div>
          </div>
        )}

        {docTab === "json-raw" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1.5">
              <p className="font-medium text-[var(--text-primary)]">
                Pesan Manual WhatsApp Tanpa Template (<code className="font-mono">POST /v1/notifications/send</code>)
              </p>
              <pre className="p-3.5 rounded-lg bg-zinc-950 text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`{
  "channel": "WHATSAPP",
  "recipient": "6281234567890",
  "body": "Halo Budi, pesanan Anda #ORD-102 sedang dikirim oleh kurir."
}`}
              </pre>
            </div>
            <div className="space-y-1.5">
              <p className="font-medium text-[var(--text-primary)]">
                Pesan Manual Email Tanpa Template (<code className="font-mono">POST /v1/notifications/send</code>)
              </p>
              <pre className="p-3.5 rounded-lg bg-zinc-950 text-emerald-400 font-mono text-[11px] overflow-x-auto leading-relaxed">
{`{
  "channel": "EMAIL",
  "recipient": "budi@example.com",
  "subject": "Konfirmasi Pembayaran #ORD-102",
  "body": "Halo Budi,\\n\\nPembayaran Anda telah kami terima. Terima kasih."
}`}
              </pre>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Buat Template Baru" maxWidth="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--neutral-bg)] border border-[var(--neutral-border)] px-3 py-2">
            <span className="text-[11px] text-[var(--text-secondary)] inline-flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-500" /> Bingung mulai dari mana? Isi otomatis dengan contoh:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(TEMPLATE_PRESETS[form.channel] || []).map((preset) => (
                <button
                  key={preset.code}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-2.5 py-1 rounded-md border border-[var(--neutral-border)] bg-[var(--neutral-surface)] text-[11px] font-medium text-[var(--text-primary)] hover:border-[var(--primary)] transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Nama Template</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Verifikasi OTP"
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Kode (unik)</label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="e.g. otp_login"
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Channel</label>
              <select
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Variabel (otomatis terdeteksi / pisah koma)</label>
              <input
                type="text"
                value={form.variables}
                onChange={(e) => setForm({ ...form, variables: e.target.value })}
                placeholder="e.g. nama, otp"
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]"
              />
            </div>
          </div>
          {form.channel === "EMAIL" && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Subject Email</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                placeholder="e.g. Kode Verifikasi OTP Anda"
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Isi Pesan</label>
            <textarea
              rows={3}
              required
              value={form.body}
              onChange={(e) => handleBodyChange(e.target.value)}
              placeholder="Halo {{nama}}, kode OTP Anda adalah {{otp}}. Berlaku selama {{berlaku_menit}} menit."
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]"
            />
          </div>

          {renderFormGuidance()}

          {submissionWarning && (
            <div role="alert" className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <p>{submissionWarning}</p>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  void refetch();
                }}
                className="mt-2 font-medium underline"
              >
                Periksa Daftar Template
              </button>
            </div>
          )}
          <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 -mb-4 px-4 sm:px-6 py-3 bg-[var(--neutral-surface)] border-t border-[var(--neutral-border)] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--neutral-bg)]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving || Boolean(submissionWarning)}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Template"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title="Edit Template" maxWidth="max-w-2xl">
        <form onSubmit={handleUpdate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Nama Template</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Kode</label>
              <input
                type="text"
                value={form.code}
                disabled
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-muted)] opacity-60"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Variabel (otomatis terdeteksi / pisah koma)</label>
            <input
              type="text"
              value={form.variables}
              onChange={(e) => setForm({ ...form, variables: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm font-mono text-[var(--text-primary)]"
            />
          </div>
          {form.channel === "EMAIL" && (
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Subject Email</label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5">Isi Pesan</label>
            <textarea
              rows={3}
              required
              value={form.body}
              onChange={(e) => handleBodyChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--neutral-border)] bg-[var(--neutral-bg)] text-sm text-[var(--text-primary)]"
            />
          </div>

          {renderFormGuidance()}

          <div className="sticky bottom-0 z-10 -mx-4 sm:-mx-6 -mb-4 px-4 sm:px-6 py-3 bg-[var(--neutral-surface)] border-t border-[var(--neutral-border)] flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--neutral-bg)]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--on-primary)] text-xs font-medium hover:bg-[var(--primary-hover)] disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Hapus Template" maxWidth="max-w-md">
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            Yakin ingin menghapus template <span className="font-semibold text-[var(--text-primary)]">{deleting?.name}</span>?
            Tindakan ini tidak dapat dibatalkan.
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="px-4 py-2 rounded-lg border border-[var(--neutral-border)] text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--neutral-bg)]"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? "Menghapus..." : "Ya, Hapus"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
