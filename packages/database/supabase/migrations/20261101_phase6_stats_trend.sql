-- Migrasi: statistik tren harian & kanal notifikasi via GROUP BY
-- Agregasi di database — tidak fetch seluruh row ke memori Node.js

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
