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
│   ├── dispatch-service/         # 🚀 Service 5: WA Meta API & Nodemailer Email Workers
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
- Docker Desktop (berjalan)

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

#### 2. Jalankan Redis saja (via Docker)
```bash
docker compose up -d redis
```

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
