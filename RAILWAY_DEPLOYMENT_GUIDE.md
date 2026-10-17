> Deployment aktif: dashboard di Vercel (https://notification-gateway.vercel.app), backend di Railway. Set `CORS_ALLOWED_ORIGINS=https://notification-gateway.vercel.app` pada gateway Railway dan `NEXT_PUBLIC_API_URL=https://gateway-service-production-9201.up.railway.app` pada environment Production Vercel, lalu redeploy. Bagian frontend Railway di bawah hanya alternatif hosting.

# 🚂 Panduan Deployment Notification Gateway ke Railway (Multi-Service)

Dokumen ini memandu proses deployment sistem **Notification Gateway** ke platform **Railway** dengan arsitektur **Multi-Service**, termasuk pemisahan environment antara lokal dan produksi, serta inisialisasi database PostgreSQL & PostgREST di Railway.

---

## 🏗️ 1. Arsitektur Deployment di Railway

```
                                  [ Internet / Browser ]
                                     |               |
                https://dashboard... |               | https://gateway...
                                     v               v
                             +---------------+   +-----------------+
                             |   frontend    |-->| gateway-service |
                             |   (Next.js)   |   |   (Port 3001)   |
                             +---------------+   +--------+--------+
                                                          | (Railway Private Network)
        +------------------+-----------------+------------+------------------+
        |                  |                 |                               |
        v                  v                 v                               v
+---------------+  +---------------+  +----------------------+      +----------------------+
| auth-service  |  | client-service|  | notification-service |      | callback-log-service |
|  (Port 3002)  |  |  (Port 3003)  |  |     (Port 3004)      |      |     (Port 3005)      |
+-------+-------+  +-------+-------+  +----------+-----------+      +----------+-----------+
        |                  |                     |                             |
        +------------------+---------------------+-----------------------------+
                           |
                           v
        +----------------------------------------+       +-------------------+
        |               postgrest                |       | dispatch-service  |
        |  (Port 3000 - HTTP REST Adapter)       |       |  (Worker Queue)   |
        +-------------------+--------------------+       +---------+---------+
                            |                                      |
                            v                                      v
                 +---------------------+                +---------------------+
                 |  Railway PostgreSQL |                |    Railway Redis    |
                 +---------------------+                +---------------------+
```

---

## 🌐 2. Pemisahan Environment: Lokal vs Produksi Railway

Sistem telah dikonfigurasi untuk memisahkan file environment secara otomatis:

| Lingkungan | File Konfigurasi | Lokasi Setup | Cara Pakai |
|---|---|---|---|
| **Lokal (Dev)** | `.env.local` | Mesin pengembang (lokal) | Salin dari `.env.local.example` ke `.env.local` |
| **Produksi (Railway)** | Environment Variables | Dashboard Railway | Ikuti template `.env.railway.example` |
| **Docker Compose** | `.env` | Mesin pengembang (lokal) | Salin dari `.env.example` ke `.env` |

> 🔒 **Keamanan**: File `.env`, `.env.local`, dan `.env.production` sudah otomatis diabaikan oleh `.gitignore` sehingga aman dari kebocoran kredensial ke Git repository.

---

## 📋 3. Langkah-demi-Langkah Deployment ke Railway

### Langkah 1: Buat Project Baru di Railway
1. Login ke [Railway Dashboard](https://railway.app).
2. Klik tombol **"New Project"** -> Pilih **"Empty Project"**.
3. Beri nama project, misal: `Notification-Gateway`.

---

### Langkah 2: Tambahkan Database PostgreSQL & Jalankan Skrip Inisialisasi
1. Di dalam project Railway, klik **"+ New"** -> **"Database"** -> **"Add PostgreSQL"**.
2. Tunggu hingga service PostgreSQL selesai dibuat.
3. Jalankan skrip skema database:
   - **Cara A (Manual via Dashboard):**
     1. Klik service PostgreSQL -> pilih tab **"Data"** -> klik tombol **"Query"**.
     2. Buka file `scripts/railway-init.sql` di repository ini, copy seluruh isinya.
     3. Paste ke editor query Railway, lalu klik **"Run Query"**.
   - **Cara B (Otomatis via Terminal):**
     1. Ambil URL koneksi publik dari tab **"Connect"** (misal: `postgresql://postgres:...`).
     2. Jalankan perintah di terminal:
        ```bash
        node scripts/migrate-railway.js "postgresql://postgres:password@host:port/railway"
        ```

---

### Langkah 3: Tambahkan Service PostgREST (REST API Adapter)
Karena kode backend menggunakan pustaka `@supabase/supabase-js`, kita memerlukan PostgREST untuk menyediakan endpoint REST API di atas PostgreSQL Railway:
1. Di project Railway, klik **"+ New"** -> **"Docker Image"**.
2. Masukkan nama image: `postgrest/postgrest:latest` lalu klik Enter.
3. Ubah nama service menjadi `postgrest`.
4. Masuk ke tab **"Variables"** pada service `postgrest` dan tambahkan:
   ```env
   PGRST_DB_URI=${{Postgres.DATABASE_URL}}
   PGRST_DB_SCHEMAS=public
   PGRST_DB_ANON_ROLE=anon
   PGRST_JWT_SECRET=super-secret-jwt-key-yang-sangat-kuat-min-32-karakter
   PORT=3000
   ```
5. PostgREST **TIDAK PERLU** dibuatkan public domain (cukup berjalan di Railway Private Networking).

---

### Langkah 4: Tambahkan Database Redis (Message Queue & Caching)
1. Klik **"+ New"** -> **"Database"** -> **"Add Redis"**.
2. Railway otomatis membuat service Redis dengan variabel bawaan `REDIS_URL`.

---

### Langkah 5: Konfigurasi Shared Variables di Railway
Agar tidak perlu mengulang variabel yang sama di setiap service, tambahkan ke Shared Variables:
1. Klik menu **"Settings"** pada project Railway -> pilih **"Shared Variables"**.
2. Tambahkan variabel berikut:
   ```env
   NODE_ENV=production
   JWT_SECRET=super-secret-jwt-key-yang-sangat-kuat-min-32-karakter
   AES_ENCRYPTION_KEY=d7a31f8b65287c12f2048f0e52719a710bc4928d1c9ef007b8b209a3cf8419de
   POSTGREST_DIRECT=true
   SUPABASE_URL=http://${{postgrest.RAILWAY_PRIVATE_DOMAIN}}:3000
   SUPABASE_SERVICE_ROLE_KEY=super-secret-jwt-key-yang-sangat-kuat-min-32-karakter
   REDIS_URL=${{Redis.REDIS_URL}}
   ```
   > 💡 *Catatan:* `AES_ENCRYPTION_KEY` bisa di-generate sendiri dengan perintah:
   > `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

---

### Langkah 6: Tambahkan Service Backend (Dari GitHub Repo)

Untuk setiap service backend di bawah ini, lakukan:
1. Klik **"+ New"** -> **"GitHub Repo"** -> Pilih repository `Notification-Service`.
2. Klik service yang baru dibuat -> tab **"Settings"**:
   - Atur **Root Directory**: `/`
   - Atur **Dockerfile Path**: sesuai tabel di bawah.
3. Masuk ke tab **"Variables"** dan isi variabel spesifiknya.

| Nama Service | Dockerfile Path | Variables Khusus | Networking |
|---|---|---|---|
| **`gateway-service`** | `services/gateway-service/Dockerfile` | `PORT=3001`<br>`AUTH_SERVICE_URL=http://${{auth-service.RAILWAY_PRIVATE_DOMAIN}}:3002`<br>`CLIENT_SERVICE_URL=http://${{client-service.RAILWAY_PRIVATE_DOMAIN}}:3003`<br>`NOTIFICATION_SERVICE_URL=http://${{notification-service.RAILWAY_PRIVATE_DOMAIN}}:3004`<br>`CALLBACK_LOG_SERVICE_URL=http://${{callback-log-service.RAILWAY_PRIVATE_DOMAIN}}:3005`<br>`CORS_ALLOWED_ORIGINS=https://notification-gateway.vercel.app` | **Public Domain** (Generate di tab Networking) |
| **`auth-service`** | `services/auth-service/Dockerfile` | `PORT=3002` | Private |
| **`client-service`** | `services/client-service/Dockerfile` | `PORT=3003` | Private |
| **`notification-service`** | `services/notification-service/Dockerfile` | `PORT=3004` | Private |
| **`dispatch-service`** | `services/dispatch-service/Dockerfile` | `WA_SESSION_PATH=/app/wa-sessions`<br>*(Opsional: Tambahkan Railway Volume di Settings -> Volumes dengan mount `/app/wa-sessions` agar sesi WA Baileys persisten)* | Worker (No Port) |
| **`callback-log-service`**| `services/callback-log-service/Dockerfile` | `PORT=3005` | Private |

---

### Langkah 7: Tambahkan Service Frontend (Next.js Dashboard)
1. Klik **"+ New"** -> **"GitHub Repo"** -> Pilih repository `Notification-Service`.
2. Ganti nama service menjadi `frontend`.
3. Tab **"Settings"**:
   - **Root Directory**: `/`
   - **Dockerfile Path**: `frontend/Dockerfile`
4. Tab **"Variables"**:
   ```env
   PORT=3000
   NEXT_PUBLIC_API_URL=https://${{gateway-service.RAILWAY_PUBLIC_DOMAIN}}
   ```
5. Tab **"Networking"**: Klik **"Generate Domain"** (misal: `https://frontend-production.up.railway.app`).

---

## ✅ 4. Verifikasi & Pengujian Deployment

1. **Cek Gateway Health:**
   Buka di browser atau cURL:
   ```bash
   curl https://<domain-gateway>.up.railway.app/health
   ```
   Respons yang diharapkan: `{"status":"ok", ...}`

2. **Cek PostgREST Connection:**
   Service backend tidak boleh mencetak error koneksi Supabase di logs.

3. **Cek Dashboard Frontend:**
   Buka domain public frontend di browser. Halaman login admin seharusnya dapat dimuat dan dapat berkomunikasi dengan API Gateway.
