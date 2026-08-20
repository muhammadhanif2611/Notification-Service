# 📢 Notification Service (Modular Microservices & SDK-Ready)

> **Middleware Notification Gateway & Dispatcher System** berbasis arsitektur **Modular Microservices**, **Supabase (PostgreSQL)**, **Pure JavaScript (Node.js)**, dan **SDK Ready (@notification-gateway/sdk)**.

---

## 🏛️ Arsitektur Monorepo Workspaces

```
notification-service/
├── 🖥️ frontend/                   # Web Portal Admin Dashboard (Next.js 14/15 + Tailwind CSS)
├── ⚡ services/                   # LAYER MICROSERVICES BACKEND
│   ├── gateway-service/          # 🛡️ Service 1: Ingestion API Gateway & Custom Auth Proxy (Port 3001)
│   ├── auth-service/             # 🔐 Service 2: Auth Service Custom (Port 3002)
│   ├── client-service/           # 📁 Service 3: Projects, API Keys & Templates (Port 3003)
│   ├── notification-service/     # 📡 Service 4: Notification Ingestion & Queue (Port 3004)
│   ├── dispatch-service/         # 🚀 Service 5: WhatsApp Baileys & Nodemailer Email Workers
│   └── callback-log-service/     # 🔔 Service 6: Webhook Callback (HMAC Signed) & Logs (Port 3005)
│
├── 🧩 packages/                   # LAYER SHARED PACKAGES
│   ├── sdk/                      # 📦 Client SDK (@notification-gateway/sdk) (Pure JS)
│   ├── database/                 # 🗄️ Supabase DB Client & Migrations
│   └── shared/                   # 🛠️ Shared Crypto, JWT, Zod Validators, & Constants
│
├── 🐳 docker-compose.yml          # Container Orchestration (Redis Queue & Microservices)
└── 📦 package.json                # Root Monorepo Configuration
```

---

## 🚀 Panduan Menjalankan Proyek (Quick Start)

### Prasyarat
- Node.js 22+ & npm
- Docker Desktop (hanya untuk mode produksi/deploy — lihat catatan Redis di bawah)

### 🗄️ Redis: Development vs Produksi

| Fase | Redis | Cara |
|------|-------|------|
| **Development (sekarang)** | ☁️ **Upstash** (cloud) | Set `REDIS_URL=rediss://...@....upstash.io:6379` di `.env`. Tidak perlu Docker Redis → hemat resource device. |
| **Produksi (deploy nanti)** | 🐳 **Docker Redis** (container) | Container `redis` di `docker-compose.yml`. Service otomatis pakai `REDIS_HOST=redis`. |

> **Tidak perlu ubah kode saat pindah.** Kode memprioritaskan `REDIS_URL`; jika kosong, otomatis fallback ke `REDIS_HOST/PORT`. Jadi saat deploy nanti cukup jalankan `docker compose up` (Redis container jalan) dan **hapus/kosongkan `REDIS_URL`** — semua service langsung pakai Redis Docker.

> ⚠️ **PENTING — Pilih SALAH SATU mode, jangan keduanya bersamaan!**
> Jika container Docker sedang berjalan, port 3000–3005 & 6379 sudah dipakai,
> sehingga `npm run dev` akan gagal (`EADDRINUSE`). Jalankan `npm run docker:down`
> dulu sebelum beralih ke mode development lokal (dan sebaliknya).

### Opsi A — Semua via Docker (1 Perintah, Direkomendasikan) 🐳

Jalankan **seluruh stack** (Redis + 6 backend service + frontend) sekaligus:

```bash
docker compose up -d --build
```

Atau gunakan shortcut npm:

```bash
npm run docker:up      # Build & start semua container
npm run docker:logs    # Lihat log semua service (realtime)
npm run docker:down    # Stop semua container
```

Akses:
| Service | URL |
|---------|-----|
| 🖥️ Frontend Dashboard | http://localhost:3000 |
| 🛡️ API Gateway | http://localhost:3001/health |
| 🔐 Auth Service | http://localhost:3002/health |
| 📁 Client Service | http://localhost:3003/health |
| 📡 Notification Service | http://localhost:3004/health |
| 🔔 Callback & Log Service | http://localhost:3005/health |
| 🗄️ Redis | localhost:6379 |

> **Catatan:** Setelah `up`, tunggu ±30–60 detik sampai semua container berstatus `healthy`. Cek dengan `docker ps`.

---

### Opsi B — Development Lokal (Hot Reload)

> Pastikan container Docker sudah distop dulu: `npm run docker:down`

#### 1. Instalasi Dependency Monorepo
```bash
npm install
```

#### 2. Siapkan Redis
Selama development, Redis memakai **Upstash** (sudah dikonfigurasi via `REDIS_URL` di `.env`) — **tidak perlu menjalankan Docker Redis sama sekali**.

> Jika suatu saat ingin tes dengan Redis lokal: kosongkan `REDIS_URL` di `.env`, lalu `docker compose up -d redis`.

#### 3. Jalankan SEMUA service sekaligus (1 terminal)
```bash
npm run dev            # Frontend + semua backend (dengan concurrently)
```

Atau hanya backend saja:
```bash
npm run dev:backend    # 6 backend service
```

#### Alternatif: jalankan satu per satu (terminal terpisah)
```bash
npm run dev:frontend     # Port 3000
npm run dev:gateway      # Port 3001 (Gateway)
npm run dev:auth         # Port 3002 (Auth)
npm run dev:client       # Port 3003 (Client Management)
npm run dev:notification # Port 3004 (Ingestion Queue)
npm run dev:dispatch     # Background Worker (WA & Email)
npm run dev:callback     # Port 3005 (Callback & Logs)
```

---

## 📱 Setup WhatsApp (Baileys)

Channel WhatsApp memakai **[Baileys](https://github.com/WhiskeySockets/Baileys)** (WhatsApp Web multi-device), **bukan** Meta Cloud API. Karena itu perlu **pairing satu kali** via QR code:

1. **Jalankan dispatch-service** (`npm run dev:dispatch`). Saat pertama kali, **QR code akan muncul di terminal/log**.
2. **Scan QR** dari HP: WhatsApp → **Settings → Linked Devices → Link a Device**.
3. Setelah tersambung, status berubah jadi `CONNECTED` dan sesi tersimpan di folder `wa-sessions/` (persisten, QR tidak perlu di-scan ulang saat restart).
4. **Kelola lewat Dashboard Admin** → menu **WhatsApp Session** (`/admin/wa-session`):
   - Lihat status koneksi real-time
   - Tampilkan QR pairing tanpa buka terminal
   - **Reset Sesi** (logout + hapus auth state + QR baru)

> **Endpoint API** (admin only):
> - `GET /v1/clients/wa-session` → status & QR string
> - `POST /v1/clients/wa-session/reset` → reset sesi

> **Sandbox mode** (API key `ngw_sand_...`) tidak memanggil Baileys sama sekali — pesan hanya disimulasikan, jadi tidak perlu pairing untuk testing.

## 📧 Setup Email (Nodemailer)

Channel Email memakai **Nodemailer (SMTP)**. Daftarkan vendor SMTP lewat Dashboard Admin → **Vendors** (atau `POST /v1/clients/vendors`):

```json
{
  "provider": "NODEMAILER",
  "name": "Gmail SMTP",
  "channel": "EMAIL",
  "priority": 1,
  "credentials": {
    "host": "smtp.gmail.com",
    "port": 587,
    "secure": false,
    "user": "you@gmail.com",
    "pass": "app-password",
    "from": "Notification Gateway <you@gmail.com>"
  }
}
```

Kredensial dienkripsi **AES-256-GCM** sebelum disimpan, lalu didekripsi oleh dispatch-service saat mengirim. Transporter Nodemailer di-*pool* (reuse koneksi) untuk performa.

> **Catatan:** Tabel `vendors` saat ini **khusus untuk Email (SMTP)**. Channel WhatsApp memakai **Baileys** yang tidak memakai vendor credentials — koneksinya dikelola lewat sesi (lihat bagian *Setup WhatsApp* di atas), sehingga WhatsApp tidak perlu didaftarkan sebagai vendor.
