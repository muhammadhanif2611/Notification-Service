-- Migrasi: fungsi RPC statistik notifikasi via GROUP BY
-- Menghindari fetch seluruh row notification_logs ke memori Node.js

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
