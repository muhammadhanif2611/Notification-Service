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

### 1. Instalasi Dependency Monorepo
```bash
npm install
```

### 2. Jalankan Container Redis Queue
```bash
docker compose up -d redis
```

### 3. Jalankan Microservices Backend
```bash
npm run dev:gateway      # Port 3001 (Gateway)
npm run dev:auth         # Port 3002 (Auth)
npm run dev:client       # Port 3003 (Client Management)
npm run dev:notification # Port 3004 (Ingestion Queue)
npm run dev:dispatch     # Background Worker (WA & Email)
npm run dev:callback     # Port 3005 (Callback & Logs)
```

### 4. Jalankan Frontend Web Dashboard
```bash
npm run dev:frontend     # Port 3000
```
