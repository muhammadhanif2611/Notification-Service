BEGIN;

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

CREATE INDEX IF NOT EXISTS idx_projects_owner ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_logs_project_created ON public.notification_logs(project_id, created_at);

-- Aggregate before joining so API keys, templates and messages cannot multiply counts.
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

-- Views contain account/usage metadata only, never password hashes or API secrets.
-- The admin endpoints enforce authentication and role before querying these views.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    GRANT SELECT ON public.admin_project_usage, public.admin_client_overview, public.admin_client_summary TO anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT SELECT ON public.admin_project_usage, public.admin_client_overview, public.admin_client_summary TO service_role;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
