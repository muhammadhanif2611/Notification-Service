# 📋 Implementation Plan: Notification Gateway (Modular Microservices Architecture)

> **Visi Project**: Membangun *Middleware Single Notification Gateway* terpusat multi-channel (WhatsApp & Email) berbasis arsitektur **Modular Microservices**, **Supabase PostgreSQL**, **Pure JavaScript (Node.js)**, **Custom JWT Auth**, dan **Client SDK Ready (@notification-gateway/sdk)**.

---

## 💎 Standar Clean Code & Best Practices (Mandatori Seluruh Fase)

Seluruh eksekusi kode di setiap fase mematuhi 4 standar **Clean Code**:
1. **KISS (Keep It Simple, Stupid)**: Kode dibuat sederhana, langsung pada tujuan, dan memiliki satu tanggung jawab tunggal.
2. **DRY (Don't Repeat Yourself)**: Menghindari duplikasi kode dengan memanfaatkan pustaka bersama di `packages/shared` & `packages/database`.
3. **Layered Architecture**: `config/`, `controllers/`, `services/`, `routes/`, `middlewares/`.
4. **Centralized Error Handling**: Custom error class (`AppError`) dan middleware `errorHandler`.

---

## 🛠️ 1. Tech Stack Final

| Layer | Teknologi Terpilih | Deskripsi |
| :--- | :--- | :--- |
| **Bahasa & Runtime** | **Node.js v18+, Pure JavaScript (Native ESM)** | Tanpa TypeScript, tanpa build/bundling step (*Zero build overhead*). |
| **Backend Framework** | **Express.js** | Gateway & REST API Services. |
| **Queue & Async Engine** | **BullMQ + Redis** | Antrean pesan, rate limiting, exponential retry. |
| **Pengiriman Email** | **Nodemailer** | Adapter SMTP / Resend Provider. |
| **Pengiriman WhatsApp** | **Native Fetch API** | Meta WhatsApp Business Cloud API v18+. |
| **Database** | **Supabase (PostgreSQL)** | Database relasional terpusat di cloud. |
| **DB Client** | **@supabase/supabase-js** | Shared query helper & connection client. |
| **Autentikasi** | **Custom Auth Service** | `bcryptjs` (hash password) + `jsonwebtoken` (JWT Session), 2 role (`admin`/`user`). |
| **Keamanan Otorisasi** | **Middleware Otorisasi Custom** | Validasi JWT & cek role per-request di gateway/auth service. |
| **Client SDK** | **@notification-gateway/sdk** | Pure JS/ESM Client Library (`client.whatsapp.send()`, `client.email.send()`). |
| **HTTP Client (SDK)** | **Fetch API + AbortController** | Timeout otomatis & lightweight request handling. |
| **Hashing API Key** | **bcryptjs** | Format API Key `ngw_prod_...` & `ngw_sand_...`. |
| **Validasi Skema** | **Zod** | Schema validation engine untuk input request. |
| **Signature Webhook** | **Node.js Native Crypto** | HMAC SHA-256 (`X-Gateway-Signature`). |
| **Frontend Web** | **Next.js 14/15 (App Router)** | Dashboard UI Admin (Port 3000). |
| **Styling & UI Icons** | **Tailwind CSS & Lucide React** | Antarmuka modern & responsive. |
| **Grafik & Analytics** | **Recharts** | Visualisasi tren pengiriman pesan & statistik vendor. |
| **Container & DevOps** | **Docker & Docker Compose** | Redis + 6 microservices containers. |
| **Monorepo Manager** | **npm Workspaces** | Pengelolaan 6 services & 3 shared packages dalam 1 repository. |

---

## 🏛️ 2. Struktur Repository & Pemetaan 6 Microservices (`npm Workspaces`)

```
notification-gateway/
├── services/
│   ├── gateway-service/         <- Express.js (Port 3001), Single Entrypoint, validasi JWT & API Key, proxy routing.
│   ├── auth-service/            <- Register/Login custom (bcryptjs hash, JWT token), model 2 role (admin/user), audit trail.
│   ├── client-service/          <- CRUD Project/Aplikasi Klien, API Key (hash bcryptjs), Template, Threshold, Vendor Credentials.
│   ├── notification-service/    <- Ingestion & validasi Zod, cek Threshold/Sandbox, simpan ke DB, push job ke BullMQ (<50ms).
│   ├── dispatch-service/        <- 1 proses, 2 BullMQ Workers (/src/whatsapp, /src/email): Meta Cloud API & Nodemailer SMTP, retry.
│   └── callback-log-service/    <- Konsumsi status-queue, simpan log & audit trail, kirim webhook signed HMAC SHA-256, expose logs.
│
├── packages/
│   ├── database/                <- Wrapper @supabase/supabase-js, shared query helper antar service.
│   ├── sdk/                     <- @notification-gateway/sdk — client library Pure JS/ESM untuk aplikasi internal.
│   └── shared/                  <- bcryptjs, Zod validation schema, Node Crypto HMAC SHA-256 signature helper.
│
├── frontend/                    <- Next.js (App Router) Admin Portal Web — satu-satunya yang bicara ke gateway-service.
├── docker-compose.yml           <- Container orchestration Redis & 6 microservices.
└── package.json                 <- Root monorepo configuration (npm workspaces).
```

---

## 🚦 3. RENCANA FASE EKSEKUSI (Fase 0 hingga Fase 8)

- [x] **Fase 0 — Infrastruktur Dasar & Monorepo Setup** (SELESAI ✅)
- [x] **Fase 1 — Autentikasi Custom Auth Service & Audit Trail** (SELESAI ✅)
- [x] **Fase 2 — Client Service & Management** (SELESAI ✅)
- [ ] **Fase 3 — Notification Service & Ingestion Engine** (Berikutnya 🎯)
- [ ] **Fase 4 — Dispatch Service & Dual Workers**
- [ ] **Fase 5 — Callback & Log Service**
- [ ] **Fase 6 — Client SDK Ready**
- [ ] **Fase 7 — Dashboard Frontend**
- [ ] **Fase 8 — Integrasi, Testing, & Deployment**
