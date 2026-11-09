-- =============================================================================
-- NOTIFICATION GATEWAY — MASTER MIGRATION UNTUK SUPABASE SQL EDITOR
-- =============================================================================
-- Jalankan di: https://supabase.com -> Project -> SQL Editor -> New Query -> Run
-- Seluruh perintah idempotent (aman dijalankan pada database baru maupun lama).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_entity VARCHAR(100) NOT NULL,
    detail TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

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
    webhook_events JSONB DEFAULT '["message.delivered", "message.failed"]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS webhook_events JSONB DEFAULT '["message.delivered", "message.failed"]'::jsonb;

CREATE TABLE IF NOT EXISTS public.api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_prefix VARCHAR(20) NOT NULL,
    key_hash VARCHAR(255) NOT NULL UNIQUE,
    key_preview VARCHAR(8),
    environment VARCHAR(20) NOT NULL DEFAULT 'production',
    last_used_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS key_preview VARCHAR(8),
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(100) UNIQUE NOT NULL,
    channel VARCHAR(50) NOT NULL,
    subject VARCHAR(255),
    body TEXT NOT NULL,
    variables JSONB DEFAULT '[]'::jsonb,
    meta_template_name VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP VIEW IF EXISTS public.admin_client_summary;
DROP VIEW IF EXISTS public.admin_client_overview;
DROP VIEW IF EXISTS public.admin_project_usage;
DROP TRIGGER IF EXISTS templates_track_review ON public.templates;
DROP FUNCTION IF EXISTS public.track_template_review_version();
DROP INDEX IF EXISTS public.idx_templates_review_queue;

ALTER TABLE public.templates
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS rejection_reason,
  DROP COLUMN IF EXISTS reviewed_by,
  DROP COLUMN IF EXISTS reviewed_at,
  DROP COLUMN IF EXISTS review_version;

CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    provider VARCHAR(20) NOT NULL DEFAULT 'NODEMAILER',
    credential_encrypted TEXT NOT NULL DEFAULT '',
    credential_iv VARCHAR(32) NOT NULL DEFAULT '',
    credential_auth_tag VARCHAR(32) NOT NULL DEFAULT '',
    priority INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vendors
  DROP COLUMN IF EXISTS credentials,
  ADD COLUMN IF NOT EXISTS provider VARCHAR(20) NOT NULL DEFAULT 'NODEMAILER',
  ADD COLUMN IF NOT EXISTS credential_encrypted TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS credential_iv VARCHAR(32) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS credential_auth_tag VARCHAR(32) NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id VARCHAR(100) UNIQUE NOT NULL,
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL,
    recipient VARCHAR(255) NOT NULL,
    template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    retry_count INT DEFAULT 0,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.suppression_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact VARCHAR(255) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    reason VARCHAR(50) NOT NULL DEFAULT 'MANUAL',
    source_log_id UUID REFERENCES public.notification_logs(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contact, channel)
);

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
CREATE INDEX IF NOT EXISTS idx_logs_project_created ON public.notification_logs(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_webhooks_log_notification ON public.webhooks_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_log_message ON public.webhooks_log(message_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_log_created ON public.webhooks_log(created_at);
CREATE INDEX IF NOT EXISTS idx_suppression_contact ON public.suppression_list(contact);
CREATE INDEX IF NOT EXISTS idx_suppression_channel ON public.suppression_list(channel);

CREATE OR REPLACE VIEW public.admin_project_usage WITH (security_invoker = true) AS
SELECT p.id, p.owner_id, p.name, p.slug, p.is_active, p.daily_quota, p.rate_limit_per_min, p.created_at,
  COALESCE(k.total_keys, 0) AS total_keys, COALESCE(k.active_keys, 0) AS active_keys, k.last_api_use_at,
  COALESCE(t.total_templates, 0) AS total_templates,
  COALESCE(n.total_messages, 0) AS total_messages, COALESCE(n.messages_today, 0) AS messages_today,
  COALESCE(n.successful_messages, 0) AS successful_messages, COALESCE(n.failed_messages, 0) AS failed_messages,
  n.last_message_at
FROM public.projects p
LEFT JOIN (
  SELECT project_id, COUNT(*) AS total_keys, COUNT(*) FILTER (WHERE is_active) AS active_keys,
    MAX(last_used_at) AS last_api_use_at FROM public.api_keys GROUP BY project_id
) k ON k.project_id = p.id
LEFT JOIN (
  SELECT project_id, COUNT(*) AS total_templates
  FROM public.templates GROUP BY project_id
) t ON t.project_id = p.id
LEFT JOIN (
  SELECT project_id, COUNT(*) AS total_messages,
    COUNT(*) FILTER (WHERE created_at >= (date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta')
      AND created_at < (date_trunc('day', now() AT TIME ZONE 'Asia/Jakarta') AT TIME ZONE 'Asia/Jakarta') + interval '1 day') AS messages_today,
    COUNT(*) FILTER (WHERE status IN ('SENT', 'DELIVERED', 'READ')) AS successful_messages,
    COUNT(*) FILTER (WHERE status = 'FAILED') AS failed_messages, MAX(created_at) AS last_message_at
  FROM public.notification_logs GROUP BY project_id
) n ON n.project_id = p.id;

CREATE OR REPLACE VIEW public.admin_client_overview WITH (security_invoker = true) AS
SELECT c.id, c.email, c.name, c.is_active, c.last_login_at, c.created_at,
  COUNT(p.id) AS total_projects, COUNT(p.id) FILTER (WHERE p.is_active) AS active_projects,
  COALESCE(SUM(p.total_keys), 0)::bigint AS total_keys, COALESCE(SUM(p.active_keys), 0)::bigint AS active_keys,
  MAX(p.last_api_use_at) AS last_api_use_at, MAX(p.last_message_at) AS last_message_at,
  COALESCE(SUM(p.total_templates), 0)::bigint AS total_templates,
  COALESCE(SUM(p.total_messages), 0)::bigint AS total_messages,
  COALESCE(SUM(p.messages_today), 0)::bigint AS messages_today,
  COALESCE(SUM(p.successful_messages), 0)::bigint AS successful_messages,
  COALESCE(SUM(p.failed_messages), 0)::bigint AS failed_messages,
  (MAX(p.last_api_use_at) IS NOT NULL OR COALESCE(SUM(p.total_messages), 0) > 0) AS has_api_activity
FROM public.profiles c LEFT JOIN public.admin_project_usage p ON p.owner_id = c.id
WHERE c.role = 'user'
GROUP BY c.id;

CREATE OR REPLACE VIEW public.admin_client_summary WITH (security_invoker = true) AS
SELECT COUNT(*) AS total_clients, COUNT(*) FILTER (WHERE is_active) AS active_clients,
  COUNT(*) FILTER (WHERE has_api_activity) AS integrated_clients,
  COALESCE(SUM(messages_today), 0)::bigint AS messages_today
FROM public.admin_client_overview;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT SELECT ON public.admin_project_usage, public.admin_client_overview, public.admin_client_summary TO anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT ON public.admin_project_usage, public.admin_client_overview, public.admin_client_summary TO service_role;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION get_notification_log_stats(p_project_id UUID DEFAULT NULL)
RETURNS TABLE(status TEXT, channel TEXT, count BIGINT)
LANGUAGE sql STABLE AS $$
  SELECT status, channel, COUNT(*)::BIGINT AS count
  FROM notification_logs
  WHERE (p_project_id IS NULL OR project_id = p_project_id)
  GROUP BY status, channel;
$$;

CREATE OR REPLACE FUNCTION get_notification_daily_trend(p_project_id UUID DEFAULT NULL, p_days INT DEFAULT 7)
RETURNS TABLE(day DATE, delivered BIGINT, queued BIGINT, failed BIGINT)
LANGUAGE sql STABLE AS $$
  SELECT
    d.day::DATE,
    COALESCE(SUM(CASE WHEN l.status IN ('SENT', 'DELIVERED', 'READ') THEN 1 ELSE 0 END), 0)::BIGINT AS delivered,
    COALESCE(SUM(CASE WHEN l.status IN ('PENDING', 'QUEUED', 'PROCESSING') THEN 1 ELSE 0 END), 0)::BIGINT AS queued,
    COALESCE(SUM(CASE WHEN l.status = 'FAILED' THEN 1 ELSE 0 END), 0)::BIGINT AS failed
  FROM generate_series(
    (CURRENT_DATE - (p_days - 1))::timestamp,
    CURRENT_DATE::timestamp,
    interval '1 day'
  ) AS d(day)
  LEFT JOIN notification_logs l
    ON l.created_at::DATE = d.day::DATE
    AND (p_project_id IS NULL OR l.project_id = p_project_id)
  GROUP BY d.day
  ORDER BY d.day;
$$;

CREATE OR REPLACE FUNCTION get_notification_channel_breakdown(p_project_id UUID DEFAULT NULL)
RETURNS TABLE(channel TEXT, count BIGINT)
LANGUAGE sql STABLE AS $$
  SELECT channel, COUNT(*)::BIGINT AS count
  FROM notification_logs
  WHERE (p_project_id IS NULL OR project_id = p_project_id)
  GROUP BY channel;
$$;

NOTIFY pgrst, 'reload schema';
