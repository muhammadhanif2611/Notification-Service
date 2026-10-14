-- =============================================================================
-- NOTIFICATION GATEWAY — COMPLETE DATABASE SCHEMA INITIALIZATION FOR RAILWAY
-- =============================================================================
-- Skrip ini menggabungkan seluruh migrasi database (Fase 1 s/d Fase 5):
-- 1. profiles & audit_logs
-- 2. projects (Multi-Tenancy dengan owner_id)
-- 3. api_keys (dengan key_preview, key_hash, revoked_at)
-- 4. templates (clean version tanpa kolom approval lama)
-- 5. vendors (dengan provider BAILEYS/NODEMAILER & enkripsi AES-256-GCM)
-- 6. notification_logs & webhooks_log
-- 7. Indexes lengkap untuk performa query high-throughput
-- 8. RPC Function: get_notification_log_stats
-- 9. PostgREST role & permissions setup
-- =============================================================================

-- Ekstensi PostgreSQL yang dibutuhkan (UUID & Crypto)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 0. POSTGREST ANON ROLE & PERMISSIONS SETUP
-- =============================================================================
-- Memastikan role anon ada untuk koneksi PostgREST standalone di Railway
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon;

-- =============================================================================
-- 1. TABEL: profiles (User & Admin Portal)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user', -- 'admin' | 'user'
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 2. TABEL: audit_logs (Pencatatan Jejak Audit Aktivitas)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g. 'LOGIN', 'CREATE_PROJECT', 'REGENERATE_API_KEY'
    target_entity VARCHAR(100) NOT NULL, -- e.g. 'projects', 'api_keys', 'templates'
    detail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 3. TABEL: projects (Katalog Aplikasi / Project Internal)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    rate_limit_per_min INT DEFAULT 100,
    daily_quota INT DEFAULT 5000,
    webhook_url TEXT,
    webhook_secret VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 4. TABEL: api_keys (Autentikasi API Key per Project)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL, -- ngw_prod_ or ngw_sand_
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_preview VARCHAR(8),
    environment VARCHAR(20) NOT NULL DEFAULT 'production', -- 'production' | 'sandbox'
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 5. TABEL: templates (Katalog Template Notifikasi)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    channel VARCHAR(50) NOT NULL, -- 'WHATSAPP' | 'EMAIL'
    subject VARCHAR(255), -- Khusus Email
    body TEXT NOT NULL, -- Variabel {{nama}}, {{otp}}, dll.
    variables JSONB DEFAULT '[]'::jsonb,
    meta_template_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 6. TABEL: vendors (Kredensial Vendor WhatsApp & Email - Terenkripsi AES-256)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL, -- e.g. 'Gmail SMTP', 'Baileys Local', 'Meta WhatsApp'
    channel VARCHAR(50) NOT NULL, -- 'WHATSAPP' | 'EMAIL'
    provider VARCHAR(20) NOT NULL DEFAULT 'NODEMAILER', -- 'BAILEYS' | 'NODEMAILER'
    credential_encrypted TEXT NOT NULL DEFAULT '',
    credential_iv VARCHAR(32) NOT NULL DEFAULT '',
    credential_auth_tag VARCHAR(32) NOT NULL DEFAULT '',
    priority INT DEFAULT 1, -- 1 = Primary, 2 = Secondary Failover
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 7. TABEL: notification_logs (Audit Trail & Log Pengiriman Pesan)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id VARCHAR(100) UNIQUE NOT NULL, -- e.g. msg_98127391
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL, -- 'WHATSAPP' | 'EMAIL'
    recipient VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, QUEUED, PROCESSING, SENT, DELIVERED, READ, FAILED
    error_message TEXT,
    retry_count INT DEFAULT 0,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 8. TABEL: webhooks_log (Histori Pengiriman Webhook ke Klien)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.webhooks_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notification_logs(id) ON DELETE CASCADE,
    message_id VARCHAR(100),
    webhook_url TEXT NOT NULL,
    payload_sent JSONB NOT NULL,
    signature VARCHAR(255),
    http_status INT,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- 9. INDEXES UNTUK PERFORMA TINGGI
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_project ON public.api_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_env ON public.api_keys(environment);
CREATE INDEX IF NOT EXISTS idx_templates_code ON public.templates(code);
CREATE INDEX IF NOT EXISTS idx_templates_project ON public.templates(project_id);
CREATE INDEX IF NOT EXISTS idx_vendors_channel ON public.vendors(channel);
CREATE INDEX IF NOT EXISTS idx_vendors_provider ON public.vendors(provider);
CREATE INDEX IF NOT EXISTS idx_logs_project_id ON public.notification_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_logs_status ON public.notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_logs_message_id ON public.notification_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.notification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_webhooks_log_notification ON public.webhooks_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_log_message ON public.webhooks_log(message_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_log_created ON public.webhooks_log(created_at);

-- =============================================================================
-- 10. RPC FUNCTION: get_notification_log_stats
-- =============================================================================
CREATE OR REPLACE FUNCTION get_notification_log_stats(p_project_id UUID DEFAULT NULL)
RETURNS TABLE(status TEXT, channel TEXT, count BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT status, channel, COUNT(*)::BIGINT AS count
  FROM notification_logs
  WHERE (p_project_id IS NULL OR project_id = p_project_id)
  GROUP BY status, channel;
$$;

-- Status akhir agar Railway Web UI Query runner (yang otomatis menempelkan LIMIT 100) tidak error
SELECT 'Database schema migration completed successfully' AS status;
