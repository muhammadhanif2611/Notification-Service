---
version: alpha
name: Notification Gateway Platform
description: Aturan desain resmi dan sistem token terstruktur untuk antarmuka Notification Gateway (Client User Portal & Platform Admin Infrastructure).

colors:
  # Base Neutral Tokens (Light Mode)
  neutral-bg: "#FAFAFA"
  neutral-surface: "#FFFFFF"
  neutral-border: "#E4E4E7"
  text-primary: "#09090B"
  text-secondary: "#71717A"
  text-muted: "#A1A1AA"

  # Base Neutral Tokens (Dark Mode)
  dark-bg: "#09090B"
  dark-surface: "#18181B"
  dark-border: "#27272A"
  dark-text-primary: "#FAFAFA"
  dark-text-secondary: "#A1A1AA"
  dark-text-muted: "#71717A"

  # Brand & Primary Action Tokens
  primary: "#09090B"
  on-primary: "#FFFFFF"
  primary-hover: "#27272A"
  
  dark-primary: "#FAFAFA"
  dark-on-primary: "#09090B"
  dark-primary-hover: "#E4E4E7"

  # Role Accents
  client-badge-bg: "#ECFDF5"
  client-badge-text: "#065F46"
  admin-badge-bg: "#18181B"
  admin-badge-text: "#FBBF24"

  # Status Indicators
  status-delivered-bg: "#DCFCE7"
  status-delivered-text: "#166534"
  status-queued-bg: "#FEF3C7"
  status-queued-text: "#92400E"
  status-failed-bg: "#FEE2E2"
  status-failed-text: "#991B1B"

typography:
  sans:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    letterSpacing: "-0.011em"
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, monospace"

  h1:
    fontSize: "1.5rem"
    fontWeight: "700"
    lineHeight: "1.3"
  h2:
    fontSize: "1.25rem"
    fontWeight: "600"
    lineHeight: "1.35"
  h3:
    fontSize: "1rem"
    fontWeight: "600"
    lineHeight: "1.4"
  body:
    fontSize: "0.875rem"
    fontWeight: "400"
    lineHeight: "1.5"
  caption:
    fontSize: "0.75rem"
    fontWeight: "500"
    lineHeight: "1.4"

rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  full: "9999px"

spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"

components:
  # Client User Components
  client-metric-card:
    backgroundColor: "{colors.neutral-surface}"
    borderColor: "{colors.neutral-border}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
    textColor: "{colors.text-primary}"

  client-broadcast-tester:
    backgroundColor: "{colors.neutral-surface}"
    borderColor: "{colors.neutral-border}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"

  client-api-key-pill:
    fontFamily: "{typography.mono.fontFamily}"
    backgroundColor: "#F4F4F5"
    textColor: "#18181B"
    rounded: "{rounded.md}"

  # Platform Admin Components
  admin-vendor-card:
    backgroundColor: "{colors.neutral-surface}"
    borderColor: "{colors.neutral-border}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"

  admin-telemetry-gauge:
    backgroundColor: "{colors.dark-bg}"
    textColor: "#34D399"
    fontFamily: "{typography.mono.fontFamily}"
    rounded: "{rounded.lg}"

  admin-alert-banner:
    backgroundColor: "#FEF2F2"
    borderColor: "#FECACA"
    textColor: "#991B1B"
    rounded: "{rounded.md}"
---

# DESIGN.md - Panduan Spesifikasi Desain Notification Gateway

Dokumen ini adalah satu-satunya sumber kebenaran (*single source of truth*) untuk desain antarmuka **Notification Gateway Platform**. Panduan ini terbagi secara terstruktur untuk dua mode peran utama: **Client User** (Portal Developer) dan **Platform Admin** (Manajemen Infrastruktur).

---

## 1. Overview
Antarmuka Notification Gateway dirancang dengan filosofi **Clean, High-Density, Developer-First, dan Border-First Design**. Antarmuka berfokus pada kecepatan membaca telemetry, kemudahan pengujian API, serta efisiensi navigasi tanpa distraksi ornamen visual (*Anti-Slop*).

- **Karakter Visual**: Monokromatik dengan kontras tinggi, menggunakan aksen warna fungsional (Emerald untuk *Delivered/Success*, Amber untuk *Queued/Pending*, Red untuk *Failed/Error*).
- **Tema**: Mendukung penuh **Mode Terang (Light)** dan **Mode Gelap (Dark)** secara responsif dan persisten melalui *Theme Switcher*.

---

## 2. Colors & Palette Policy

| Lingkungan / Peran | Token Warna | Light Mode | Dark Mode | Penggunaan |
| :--- | :--- | :--- | :--- | :--- |
| **Canvas** | `neutral-bg` | `#FAFAFA` | `#09090B` | Background utama aplikasi |
| **Kartu / Surface** | `neutral-surface` | `#FFFFFF` | `#18181B` | Panel, kartu statistik, modal |
| **Border / Divider** | `neutral-border` | `#E4E4E7` | `#27272A` | Garis pemisah komponen (Border-First) |
| **Client User Badge** | `client-badge` | Background Emerald/10, Teks `#065F46` | Background `#022C22`, Teks `#6EE7B7` | Penanda workspace proyek & environment |
| **Admin Badge** | `admin-badge` | Background `#18181B`, Teks `#FBBF24` | Background `#27272A`, Teks `#FCD34D` | Penanda hak akses Super Admin |

---

## 3. Typography Rules

- **UI Sans Font (`Inter`)**: Digunakan untuk seluruh elemen teks antarmuka, judul, navigasi, dan tombol dengan *letter-spacing* `-0.011em` agar terlihat kompak dan elegan.
- **Data Mono Font (`JetBrains Mono`)**: Wajib digunakan untuk:
  - Angka metrik dan statistik (*dengan opsi `tabular-nums`*)
  - Kode API Key (`ngw_prod_...`, `ngw_sand_...`)
  - Log Message ID (`msg_990182...`) & Latency (`280 ms`)
  - Template Variables (`{{nama}}`, `{{otp_code}}`)
  - Payload JSON & terminal logs.

---

## 4. Layout Architecture & Responsive Grid

- **Sidebar Fixed Nav**: Lebar 240px, posisi `sticky top-0 h-screen`, berisi role switcher, active project selector, dan menu navigasi.
- **Top Header**: Posisi `sticky top-0 z-10`, berisi informasi judul tab, status environment (`PROD`/`SAND`), pencarian global (`⌘K`), queue latency, theme switcher, dan bel notifikasi.
- **Content Area**: Maksimal `max-w-7xl` (1280px), padding `p-6` dengan ritme spasial `space-y-6`.

---

## 5. Elevation & Shapes

- **Tanpa Soft Shadow Berlebihan**: Mengutamakan garis tepi bersih (`border border-zinc-200 dark:border-zinc-800`). Shadow hanya digunakan dalam bentuk `shadow-xs` untuk tombol dan `shadow-xl` untuk modal/drawer.
- **Sudut Lengkung (Rounded)**:
  - `rounded-md` (8px) untuk tombol kecil, badge, input field, dan pill.
  - `rounded-xl` (12px) untuk container utama, kartu metrik, dan modal.

---

## 6. Detailed Component Specifications

 File ini secara khusus memisahkan bagian **Client User** dan **Platform Admin** agar pengembangan komponen tidak saling mencampuri hirarki fungsi:

---

### A. Bagian Client User (Developer Portal)

Client User berfokus pada pemantauan kuota harian, pembuatan API Key, draf template pesan, integrasi webhook, dan pengujian broadcast live.

1. **Dashboard Overview (Status Real-time)**:
   - *Banner Status*: Informasi kuota harian (`18.420 / 25.000`), status koneksi gateway real-time, tombol cepat *Test Broadcast* & *Buat API Key*.
   - *Kartu Metrik*: Total Terkirim (24h), Delivery Success Rate (%), Rata-rata Latency (ms), Webhook Status (`200 OK`).
   - *Bagan Visual*: Line chart tren pengiriman harian (Delivered, Queued, Failed) & Donut chart sebaran channel (WhatsApp, Email, SMS, Push).
   - *Aktivitas Log Terakhir*: Tabel ringkas 5 log transaksi pesan terakhir.

2. **Broadcast Tester (Simulator Live)**:
   - Form pengetesan pengiriman langsung dengan pilihan channel, penginputan nomor/email penerima, pemilihan template terdaftar, serta pengisian variabel dinamis.
   - Panel terminal kanan memuat evaluasi hasil render pesan dan simulasi *HTTP Status Callback* (`200 OK Delivered`).

3. **Management API Keys**:
   - Daftar kunci akses API dengan masking aman (`ngw_prod_8f9a...`), informasi tanggal dibuat, tanggal terakhir digunakan, serta tombol *Copy Key* dan *Revoke Key*.
   - Modal pembuatan API Key baru dengan pemilihan scope izin (*Read-only*, *Write/Send*, *Full Access*).

4. **Template Pesan & Draf**:
   - Filter berdasar channel (WhatsApp, Email, SMS, Push) serta penyesuaian lingkup (*Proyek Saat Ini* vs *Semua Proyek*).
   - Kartu template yang menampilkan status approval (*APPROVED*, *PENDING*, *REJECTED*), alasan penolakan jika ada, dan fitur *Test Live Preview*.
   - Modal draf pengajuan template baru dengan deteksi variabel dinamis otomatis (`{{...}}`).

5. **Webhook Config**:
   - Pengaturan URL Endpoint Webhook (`https://api.yourcompany.com/v1/notifications/callback`).
   - Fitur rahasia penandatanganan HMAC SHA-256 (*Secret Signing Key*), opsi pemilihan event trigger, dan simulator pengiriman tes ping webhook.

6. **Log Transaksi Pesan**:
   - Filter mendalam berdasarkan Status (`DELIVERED`, `QUEUED`, `FAILED`) dan Channel.
   - Slide-over Drawer untuk melihat detail urutan timeline eksekusi delivery, retry count, serta *Raw Dispatch JSON Payload*.

---

### B. Bagian Platform Admin (Infrastructure Management)

Platform Admin berfokus pada kesehatan infrastruktur global, pemantauan queue Redis, kredensial vendor provider, alokasi domain MTA, serta sistem pemicu peringatan otomatis.

1. **Admin Control Center**:
   - Ringkasan global lalu lintas pesan seluruh tenant/perusahaan, total aktif vendor, latensi rata-rata cluster, dan alokasi memori queue.
   - Peta status kesehatan cluster gateway (*Main Gateway Cluster*, *Redis Worker Pool*, *Database Cluster*, *Outbound MTA Nodes*).

2. **Vendor Provider Credentials**:
   - Manajemen integrasi penyedia layanan WhatsApp (Meta Cloud API, Twilio), Email (SendGrid, Amazon SES, Postmark), dan SMS (Telkomsel, Indosat, Twilio).
   - Konfigurasi kuota rate limit (TPS - Transaction Per Second), bobot *fallback routing* otomatis, serta manajemen API Secret Key vendor.

3. **Queue Telemetry & Worker Health**:
   - Visualisasi real-time antrean Redis (`whatsapp-priority-queue`, `email-transactional-queue`, `sms-otp-queue`).
   - Statistik pesan per detik (TPS), alokasi Worker Thread, serta kontrol cepat untuk *Purge Dead Letter Queue (DLQ)* dan *Pause Engine*.

4. **Outbound Domain MTA (Email Routing)**:
   - Pengaturan domain pengirim email (`mail.gateway.com`), status verifikasi DNS Record (SPF, DKIM 2048-bit, DMARC policy), reputasi IP, dan alokasi *Dedicated Warm IP*.

5. **Pengguna System & Tenant Workspace**:
   - Pengelolaan daftar akun klien dan admin platform, penetapan kuota harian pesan, batasan rate limit per proyek, serta penyesuaian status akun (*ACTIVE*, *SUSPENDED*).

6. **Daftar Supresi (Suppression List)**:
   - Manajemen blokir otomatis nomor/email yang mengalami *Hard Bounce*, *Spam Complaint*, atau *Unsubscribe* untuk melindungi reputasi pengirim.

7. **Sistem Peringatan Ambang Batas (Threshold Alerts)**:
   - Aturan alert otomatis ketika rate kegagalan melebihi batas (misal: *Failure rate > 5%*), kuota vendor habis, atau antrean tertunda lebih dari 5.000 pesan.

---

## 7. Do's and Don't's

### ✅ DO (Harus Dilakukan)
- Gunakan token warna referensi (`{colors.primary}`, `{colors.neutral-surface}`) untuk menjaga konsistensi.
- Pastikan semua angka statistik menggunakan font `JetBrains Mono` atau opsi `tabular-nums`.
- Pastikan setiap tombol dan input elemen memiliki kondisi *Hover*, *Focus-ring*, dan pendukung *Dark Mode*.
- Sediakan indikator salin (*CopyButton*) dengan feedback visual instan (*"Copied!"*).

### ❌ DON'T (Jangan Dilakukan)
- Jangan mencampur sudut tajam (*sharp corner*) dan sudut bulat ekstrim pada komponen yang sejajar.
- Jangan menggunakan warna teks abu-abu terang pada latar belakang putih/terang yang melanggar standar aksesibilitas WCAG AA (minimal rasio 4.5:1).
- Jangan menampilkan teks placeholder kosong; selalu sediakan *Empty State* yang informatif.
- Jangan menggabungkan kode komponen Client User dan Admin ke dalam satu modul yang campur aduk; pisahkan secara hirarki folder dan skema token.

---
*Dokumen DESIGN.md ini dibuat secara terstruktur untuk Notification Gateway Platform sebagai acuan pengembangan antarmuka manusia dan AI Coding agent.*
