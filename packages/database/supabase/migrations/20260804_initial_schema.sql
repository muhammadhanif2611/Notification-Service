-- =============================================================================
-- DATABASE SCHEMA MIGRATION: NOTIFICATION GATEWAY SYSTEM (SUPABASE POSTGRESQL)
-- =============================================================================

-- 0. Table: profiles (Tabel User/Admin Internal dengan 2 Role: 'admin' / 'user')
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

-- 1. Table: audit_logs (Pencatatan Audit Trail Aktivitas Penting)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL, -- e.g. 'LOGIN', 'CREATE_PROJECT', 'REGENERATE_API_KEY'
    target_entity VARCHAR(100) NOT NULL, -- e.g. 'projects', 'api_keys', 'templates'
    detail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Table: projects (Katalog Aplikasi / Project Internal Perusahaan)
-- owner_id: menghubungkan project ke user (client) pemiliknya
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

-- 3. Table: api_keys (Autentikasi API Key per Project - Hash bcryptjs)
CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL, -- ngw_prod_ or ngw_sand_
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    environment VARCHAR(20) NOT NULL DEFAULT 'production', -- 'production' | 'sandbox'
    last_used_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Table: templates (Katalog Template Pesan)
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    channel VARCHAR(50) NOT NULL, -- 'WHATSAPP' | 'EMAIL'
    subject VARCHAR(255), -- Khusus Email
    body TEXT NOT NULL, -- Mengandung variable {{nama}}, {{otp}}, dll.
    variables JSONB DEFAULT '[]'::jsonb,
    meta_template_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Table: vendors (Kredensial Vendor WhatsApp Meta & Email SMTP)
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL, -- e.g. 'Meta WhatsApp Cloud', 'Resend Email', 'SMTP Primary'
    channel VARCHAR(50) NOT NULL, -- 'WHATSAPP' | 'EMAIL'
    credentials JSONB NOT NULL, -- Encrypted config (Token, WABA ID, Host, Port)
    priority INT DEFAULT 1, -- 1 = Primary, 2 = Secondary Failover
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Table: notification_logs (Audit Trail & Log Pengiriman Pesan)
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

-- Indexing untuk Performa High-Throughput Query
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_logs_project_id ON public.notification_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_logs_status ON public.notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_logs_message_id ON public.notification_logs(message_id);
CREATE INDEX IF NOT EXISTS idx_templates_code ON public.templates(code);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
