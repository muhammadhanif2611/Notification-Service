# 📋 Implementation Plan: Notification Gateway
> **Visi**: Platform notifikasi internal terpusat (*mirip Resend/Twilio*) untuk lintas aplikasi internal perusahaan (Kasir, HRD, E-Commerce, dll), berbasis **Modular Microservices**, **SDK-Ready**, dibangun dengan **Pure JavaScript (Node.js)**.

---

## 🧹 0. Standar Clean Code — WAJIB di Setiap Fase

> ⚠️ **Ini bukan opsional.** Setiap baris kode yang ditulis di fase manapun **harus** mematuhi 4 standar berikut. Kode yang tidak memenuhi standar ini **wajib direfactor** sebelum fase dianggap selesai.

### Prinsip 1 — KISS *(Keep It Simple, Stupid)*
- Setiap fungsi/method hanya melakukan **satu hal** dan memiliki satu tanggung jawab tunggal
- Tidak ada logika bercabang yang dalam atau kondisi berlapis-lapis dalam satu fungsi
- Nama fungsi harus **mendeskripsikan apa yang dilakukan**, bukan bagaimana caranya
- Jika sebuah fungsi perlu komentar panjang untuk dijelaskan, itu tanda harus dipecah

### Prinsip 2 — DRY *(Don't Repeat Yourself)*
- **Tidak ada duplikasi kode** antar service — gunakan `packages/shared` untuk helper yang dipakai ulang
- **Tidak ada duplikasi query** — helper database dibungkus di `packages/database`
- Jika kode yang sama muncul lebih dari sekali, **wajib diekstrak jadi fungsi/modul tersendiri**
- Konfigurasi (port, URL, secret) hanya boleh ada di **satu tempat** (`config/env.js` per service)

### Prinsip 3 — Layered Architecture
Setiap service wajib mengikuti struktur layer berikut — **tidak boleh skip layer**:
```
routes/        → Hanya mendefinisikan endpoint & memanggil controller
controllers/   → Hanya menerima req/res, validasi input, memanggil service
services/      → Seluruh business logic, tidak boleh tahu soal req/res
config/        → Konfigurasi environment, koneksi, konstanta
middlewares/   → Cross-cutting concerns (auth, error handler, logger)
```
- Controller **tidak boleh** berisi query database langsung
- Service **tidak boleh** berisi `req`, `res`, atau `next`
- Route **tidak boleh** berisi logic apapun selain definisi path

### Prinsip 4 — Centralized Error Handling
- Semua error **wajib** menggunakan class `AppError` yang sudah ada di tiap service
- Semua handler wajib meneruskan error via `next(error)` — **tidak boleh** `res.status(500).json(...)` langsung di controller
- Middleware `errorHandler` adalah **satu-satunya** tempat yang boleh mengirim respons error ke client
- Tidak ada `try/catch` yang "menelan" error diam-diam tanpa log

### Standar Tambahan (Wajib Diterapkan Mulai Fase 2)
| Standar | Aturan |
| :--- | :--- |
| **Logging** | Gunakan `pino` — tidak ada `console.log` di production code. `console.log` hanya boleh ada saat debugging sementara |
| **Komentar JSDoc** | Setiap fungsi public (yang diekspor) wajib punya JSDoc `@param` dan `@returns` |
| **Penamaan** | `camelCase` untuk variabel/fungsi, `PascalCase` untuk class, `SCREAMING_SNAKE_CASE` untuk konstanta |
| **Async/Await** | Wajib gunakan `async/await` — tidak ada `.then().catch()` berantai |
| **Validasi Input** | Semua input dari luar (request body, params, query) wajib divalidasi dengan Zod sebelum diproses |

---

## 🛠️ 1. Tech Stack

| Layer | Teknologi | Keterangan |
| :--- | :--- | :--- |
| **Runtime & Bahasa** | Node.js v18+, Pure JavaScript (ESM) | Tanpa TypeScript, tanpa build step |
| **Web Framework** | Express.js | Semua 6 service HTTP |
| **Queue & Async** | BullMQ + Redis | Antrean pesan, retry, monitoring |
| **Kirim Email** | Nodemailer | SMTP / Resend provider |
| **Kirim WhatsApp** | Native Fetch API | Meta WhatsApp Business Cloud API v18+ |
| **Database** | Supabase (PostgreSQL) | Cloud-hosted, shared semua service |
| **DB Client** | @supabase/supabase-js | Shared via `packages/database` |
| **Hash Password/API Key** | bcryptjs | Format: `ngw_prod_...` / `ngw_sand_...` |
| **Autentikasi Sesi** | jsonwebtoken (JWT) | Custom, bukan Supabase Auth, expiry 8 jam |
| **Enkripsi Kredensial Vendor** | Node.js Native Crypto (AES-256-GCM) | Enkripsi dua-arah, key di env variable |
| **Signature Webhook** | Node.js Native Crypto (HMAC SHA-256) | Header `X-Gateway-Signature` |
| **Validasi Skema** | Zod | Semua input request divalidasi |
| **Logging** | pino | Structured JSON log per service |
| **Rate Limiting Gateway** | express-rate-limit | Proteksi dari abuse, selaras threshold |
| **Monitoring Queue** | Bull Board | Dashboard visual BullMQ di gateway |
| **SDK Client** | Fetch API + AbortController | Pure JS/ESM, timeout otomatis |
| **Frontend** | Next.js (App Router) | Dashboard Admin, Port 3000 |
| **Styling** | Tailwind CSS + Lucide React | UI modern & responsif |
| **Grafik** | Recharts | Visualisasi statistik pengiriman |
| **Container** | Docker + Docker Compose | Redis + 6 service, deploy independen |
| **Monorepo** | npm Workspaces | 6 service + 3 package dalam 1 repo |
| **Testing** | node --test (built-in) | Unit test tanpa dependency tambahan |
| **API Docs** | OpenAPI/Swagger (.yaml) | Kontrak API, basis generate SDK |

---

## 🏛️ 2. Arsitektur & Struktur Repository

```
notification-gateway/
├── services/
│   ├── gateway-service/       ← Port 3001 | Entry point, JWT & API Key auth, proxy, rate-limit, Bull Board
│   ├── auth-service/          ← Port 3002 | Register/login, bcrypt hash, JWT, 2 role (admin/user), audit trail
│   ├── client-service/        ← Port 3003 | CRUD client_apps, api_keys, templates, vendor_credentials, thresholds
│   ├── notification-service/  ← Port 3004 | Ingestion, Zod validasi, cek threshold/sandbox, push BullMQ (<50ms)
│   ├── dispatch-service/      ← Worker | 2 BullMQ Workers: WhatsApp (Meta API) & Email (Nodemailer), retry
│   └── callback-log-service/  ← Port 3005 | Update status, webhook HMAC, riwayat & statistik
│
├── packages/
│   ├── database/              ← Wrapper @supabase/supabase-js + writeAuditLog helper
│   ├── shared/                ← bcryptjs, Zod schemas, HMAC, AES-256-GCM, JWT helpers
│   └── sdk/                   ← @notification-gateway/sdk — client library Pure JS/ESM
│
├── frontend/                  ← Next.js Admin Dashboard (App Router)
├── docker-compose.yml
└── package.json               ← Root npm workspaces config
```

### Alur Komunikasi
```
SDK / App Klien
    │  x-api-key
    ▼
gateway-service (Port 3001)  ← validasi JWT / API Key, rate-limit, routing
    │
    ├──► auth-service (3002)         [HTTP Proxy — sinkron]
    ├──► client-service (3003)       [HTTP Proxy — sinkron]
    └──► notification-service (3004) [HTTP Proxy — sinkron]
              │
              ├── simpan ke Supabase (status: queued)
              └── push job → Redis BullMQ
                                │
                          dispatch-service (Worker)
                                │── Meta WhatsApp Cloud API
                                │── Nodemailer SMTP
                                └── push → status-queue
                                              │
                                      callback-log-service (3005)
                                              │── update status Supabase
                                              │── kirim webhook + HMAC
                                              └── sediakan data dashboard

Frontend (Next.js) → hanya bicara ke gateway-service (Port 3001)
```

---

## 🗃️ 3. Skema Database (Supabase PostgreSQL)

### Tabel `users`
| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| id | uuid PK | gen_random_uuid() |
| name | varchar | Nama karyawan |
| email | varchar UNIQUE | Login credential |
| password_hash | varchar | bcryptjs, tidak pernah plain |
| role | varchar | `admin` \| `user` |
| is_active | boolean | Default true |
| last_login_at | timestamptz | nullable |
| created_at | timestamptz | Default now() |
| updated_at | timestamptz | Auto-update via trigger |

> ⚠️ **Catatan Kodebase**: Saat ini bernama `profiles`. Tidak perlu rename — fungsional identik.

### Tabel `client_apps`
| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| id | uuid PK | |
| name | varchar | Nama aplikasi (Kasir, HRD, dll) |
| slug | varchar UNIQUE | Identifier URL-safe |
| description | text | Opsional |
| webhook_url | text | Endpoint callback klien |
| webhook_secret | varchar | Secret HMAC signature |
| is_active | boolean | Default true |
| created_by | uuid FK → users.id | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

> ⚠️ **Catatan Kodebase**: Saat ini bernama `projects`. Fungsional identik — termasuk kolom `rate_limit_per_min` & `daily_quota` yang tetap ada di sini (tidak dipisah ke tabel thresholds terpisah karena lebih efisien untuk proyek ini).

### Tabel `api_keys`
| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| id | uuid PK | |
| client_app_id | uuid FK → client_apps.id | |
| name | varchar | Label key (misal: "Production Key") |
| key_hash | varchar UNIQUE | Hasil bcryptjs — tidak pernah plain setelah generate |
| key_prefix | varchar | `ngw_prod_` atau `ngw_sand_` — plain untuk lookup cepat |
| key_preview | varchar(8) | **4-8 char terakhir key asli** — ditampilkan di dashboard (...a91f) |
| environment | varchar | `production` \| `sandbox` |
| is_active | boolean | Default true |
| last_used_at | timestamptz | nullable |
| created_at | timestamptz | |
| revoked_at | timestamptz | nullable — diisi saat revoke |

### Tabel `templates`
| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| id | uuid PK | |
| client_app_id | uuid FK → client_apps.id | |
| name | varchar | Nama template |
| code | varchar UNIQUE | Kode unik untuk dipanggil SDK |
| channel | varchar | `WHATSAPP` \| `EMAIL` |
| subject | varchar | Opsional, khusus Email |
| body | text | Isi dengan placeholder `{{nama}}`, `{{otp}}` |
| variables | jsonb | Daftar variabel yang dibutuhkan |
| meta_template_name | varchar | Opsional, untuk WhatsApp approved templates |
| status | varchar | `PENDING` \| `APPROVED` \| `REJECTED` |
| rejection_reason | text | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### Tabel `vendor_credentials`
| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| id | uuid PK | |
| name | varchar | Misal: "Meta WhatsApp Cloud", "Resend Email" |
| channel | varchar | `WHATSAPP` \| `EMAIL` |
| credential_encrypted | text | **AES-256-GCM enkripsi** — bukan plain, bukan hash |
| priority | int | 1 = Primary, 2 = Failover |
| is_active | boolean | Default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

> ⚠️ **Catatan Kodebase**: Saat ini bernama `vendors` dengan `credentials JSONB` plain — **wajib dimigrasi ke enkripsi AES-256-GCM**.

### Tabel `notifications`
| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| id | uuid PK | |
| message_id | varchar UNIQUE | Format: `msg_<timestamp>_<entropy>` |
| client_app_id | uuid FK → client_apps.id | |
| template_id | uuid FK → templates.id | nullable |
| channel | varchar | `WHATSAPP` \| `EMAIL` |
| recipient | varchar | Nomor HP atau email |
| payload | jsonb | Data final setelah placeholder diisi |
| status | varchar | `QUEUED` \| `PROCESSING` \| `SENT` \| `DELIVERED` \| `FAILED` |
| is_sandbox | boolean | Dari prefix API Key |
| is_broadcast | boolean | True jika bagian dari broadcast |
| broadcast_id | uuid | nullable — grup ID broadcast |
| retry_count | int | Default 0 |
| error_message | text | nullable |
| vendor_id | uuid FK → vendor_credentials.id | nullable |
| sent_at | timestamptz | nullable |
| delivered_at | timestamptz | nullable |
| created_at | timestamptz | |
| updated_at | timestamptz | |

> ⚠️ **Catatan Kodebase**: Saat ini bernama `notification_logs`. Tidak perlu rename.

### Tabel `webhooks_log`
| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| id | uuid PK | |
| notification_id | uuid FK → notifications.id | |
| webhook_url | varchar | Tujuan callback |
| payload_sent | jsonb | Isi payload yang dikirim |
| signature | varchar | Nilai HMAC SHA-256 (`X-Gateway-Signature`) |
| http_status | int | nullable — respons dari server klien |
| delivered_at | timestamptz | nullable |
| created_at | timestamptz | |

> ❌ **Kodebase**: Belum ada — harus dibuat.

### Tabel `audit_logs`
| Kolom | Tipe | Keterangan |
| :--- | :--- | :--- |
| id | uuid PK | |
| user_id | uuid FK → users.id | nullable (aksi sistem otomatis) |
| action | varchar | Misal: `LOGIN`, `CREATE_API_KEY`, `TEMPLATE_APPROVED` |
| target_entity | varchar | Nama tabel/entitas |
| target_id | uuid | nullable |
| detail | jsonb | Data tambahan (before/after) |
| created_at | timestamptz | |

### Index Performa
```sql
CREATE INDEX idx_api_keys_prefix    ON api_keys(key_prefix);
CREATE INDEX idx_notifications_app  ON notifications(client_app_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created ON notifications(created_at);
CREATE INDEX idx_notifications_broadcast ON notifications(broadcast_id);
CREATE INDEX idx_templates_code     ON templates(code);
CREATE INDEX idx_audit_user         ON audit_logs(user_id);
```

---

## 🚦 4. Fase Implementasi

### ✅ Fase 0 — Infrastruktur Dasar & Monorepo (SELESAI 100%)
- [x] npm Workspaces root config
- [x] `docker-compose.yml` untuk Redis
- [x] `packages/database` — wrapper Supabase
- [x] `packages/shared` — skeleton (hash, crypto, jwt, Zod)
- [x] `gateway-service` Express placeholder

### ✅ Fase 1 — Auth Service (SELESAI 100%)
- [x] Tabel `users` (sebagai `profiles`) di Supabase
- [x] `POST /auth/register`, `POST /auth/login`
- [x] Hash password bcryptjs, terbitkan JWT `{ userId, role }`, expiry **8 jam**
- [x] Middleware validasi JWT + cek role di gateway
- [x] Audit log aksi `LOGIN`

### 🔴 Fase 2 — Client Service (BELUM SELESAI)

**Sudah dikerjakan (tidak dihitung selesai karena ada gap wajib):**
- CRUD `client_apps` (sebagai `projects`) — fungsional
- Generate & hash API Key (bcryptjs), raw key tampil hanya sekali — fungsional
- Regenerate & revoke API Key — fungsional
- CRUD Template + Approve/Reject (khusus admin) — fungsional
- CRUD Vendor (tanpa enkripsi — **belum sesuai plan**) — belum selesai
- Audit log setiap perubahan — fungsional

**Harus diselesaikan sebelum lanjut Fase 3:**
- [ ] Tambah helper **AES-256-GCM** encrypt/decrypt di `packages/shared/src/crypto.js`
- [ ] Enkripsi vendor credentials sebelum simpan ke DB (`credential_encrypted TEXT`)
- [ ] Migrasi tabel `vendors` → `vendor_credentials` + ubah kolom `credentials JSONB` ke `credential_encrypted TEXT`
- [ ] Simpan `key_preview` (8 char terakhir raw key) saat generate/regenerate API Key
- [ ] Tambah tabel `webhooks_log` ke migration SQL

### 🔴 Fase 3 — Notification Service & Ingestion Engine (BELUM SELESAI)

**Sudah dikerjakan (tidak dihitung selesai karena ada gap wajib):**
- `POST /notifications/send` — Zod validasi, daily quota check, resolve template, persist log, enqueue BullMQ — fungsional
- `POST /notifications/broadcast` — pecah N pesan dengan `broadcast_id` — fungsional
- Deteksi sandbox/prod dari prefix API Key — fungsional
- `GET /notifications` + `GET /notifications/:messageId` — fungsional

**Harus diselesaikan sebelum lanjut Fase 4:**
- [ ] **Real-time rate limit per menit** via Redis Sliding Window (`rate_limit_per_min` di-SELECT tapi tidak dievaluasi)
- [ ] Pasang `pino` logger menggantikan `console.log`

### 🔴 Fase 4 — Dispatch Service & Dual Workers (BELUM SELESAI)
- [ ] Worker WhatsApp: konsumsi `whatsapp-queue`, kirim via Fetch ke Meta Cloud API v18+
- [ ] Worker Email: konsumsi `email-queue`, kirim via Nodemailer
- [ ] Dekripsi vendor credentials (AES-256-GCM) sebelum dipakai kirim
- [ ] Sandbox mode: simulasi pengiriman tanpa memanggil API asli
- [ ] Retry otomatis exponential backoff (konfigurasi BullMQ)
- [ ] Push job status ke `status-queue` setelah selesai/gagal
- [ ] Pasang `pino` logger

### 🔴 Fase 5 — Callback & Log Service (BELUM SELESAI)
- [ ] Worker konsumsi `status-queue`, update `notifications.status` di Supabase
- [ ] Bangun payload callback + HMAC SHA-256, kirim ke `webhook_url` App Klien
- [ ] Simpan hasil ke tabel `webhooks_log`
- [ ] `GET /logs` — riwayat notifikasi (filter tanggal/channel/status)
- [ ] `GET /statistics` — total terkirim, rasio sukses/gagal, breakdown channel
- [ ] `POST /webhook/whatsapp`, `POST /webhook/email` — terima status dari provider
- [ ] Pasang **Bull Board** di `gateway-service` untuk monitoring queue visual

### 🔴 Fase 6 — Client SDK (BELUM SELESAI)
- [ ] `client.whatsapp.send()`
- [ ] `client.email.send()`
- [ ] `client.broadcast.send()` — file `broadcast.js` belum ada
- [ ] `client.verifyWebhook(payload, signature)` — file `verifyWebhook.js` belum ada
- [ ] Timeout otomatis dengan `AbortController` (cek `http.js`)
- [ ] Dokumentasi pemakaian di `packages/sdk/README.md`
- [ ] Distribusi via **Git dependency** (skala KP), siap upgrade ke private npm registry

### 🔴 Fase 7 — Dashboard Frontend (BELUM SELESAI)
- [ ] Login via auth-service (lewat gateway, bukan Supabase Auth langsung)
- [ ] **Menu Admin**: semua fitur + Kelola Pengguna, Vendor Credentials, Threshold, Monitoring (Bull Board)
- [ ] **Menu User**: Client Apps, Template, Broadcast, Riwayat, Statistik
- [ ] Grafik Recharts (tren pengiriman, rasio sukses/gagal, breakdown channel)
- [ ] Semua request lewat gateway-service

### 🔴 Fase 8 — Integrasi, Testing & Deployment (BELUM DIMULAI)
- [ ] Uji end-to-end: SDK → gateway → notification → dispatch → callback → webhook
- [ ] Uji skenario gagal: retry, threshold, sandbox vs live
- [ ] Uji middleware otorisasi (role `user` tidak bisa akses endpoint admin)
- [ ] `Dockerfile` tiap service + `docker-compose.yml` final
- [ ] `docs/openapi.yaml` — OpenAPI spec kontrak API
- [ ] README cara jalankan + dokumentasi arsitektur & ERD

---

## 🔑 5. Keputusan Desain (Finalized)

| Keputusan | Pilihan |
| :--- | :--- |
| Auth | Custom (bcryptjs + JWT) — Supabase hanya sebagai database, bukan Supabase Auth |
| JWT Expiry | **8 jam** untuk sesi dashboard |
| API Key format | `ngw_prod_<slug>_<32 random hex>` atau `ngw_sand_<slug>_<32 random hex>` |
| API Key storage | Hash bcryptjs — plain hanya ditampilkan **1x saat generate/regenerate** |
| Vendor credential storage | **AES-256-GCM enkripsi** — perlu dekripsi untuk kirim, key disimpan di env variable |
| Threshold storage | Kolom di tabel `client_apps` (`rate_limit_per_min`, `daily_quota`) — tidak dipisah ke tabel terpisah |
| Rate limit real-time | Redis Sliding Window via BullMQ atau `express-rate-limit` dengan Redis store |
| Webhook signature | HMAC SHA-256, dikirim di header `X-Gateway-Signature` |
| SDK distribusi | Git dependency untuk skala KP, upgrade ke Verdaccio/GitHub Packages jika perlu |
| API versioning | Semua endpoint prefix `/v1/` — breaking change buat `/v2/` |

---

## ✅ 6. Checklist Akhir Sebelum Sidang / Deploy

### Keamanan
- [ ] API Key ter-hash bcrypt, tidak pernah tersimpan/terlihat plain setelah generate
- [ ] Vendor credentials terenkripsi AES-256-GCM, bukan plain di DB
- [ ] JWT secret & encryption key di environment variable, tidak di kode
- [ ] Sandbox mode benar-benar tidak memanggil API asli

### Fungsional
- [ ] Semua 6 service punya Dockerfile dan bisa jalan via `docker compose up`
- [ ] Auth custom berjalan penuh (register, login, JWT, role) tanpa Supabase Auth
- [ ] Rate limit per menit aktif dan teruji
- [ ] Retry otomatis teruji (matikan koneksi vendor sementara, lihat retry jalan)
- [ ] Webhook signature terverifikasi di sisi penerima (`client.verifyWebhook`)
- [ ] Dashboard menu berbeda sesuai role admin/user
- [ ] Audit log tercatat untuk semua aksi penting

### Kesiapan Presentasi
- [ ] SDK terpasang dan bisa dipakai dari project lain (test di luar monorepo)
- [ ] `docs/openapi.yaml` tersedia
- [ ] README cara menjalankan lengkap
- [ ] Dokumentasi arsitektur & ERD siap dipresentasikan
