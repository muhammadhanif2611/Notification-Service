import { supabase } from '@notification-gateway/database';

// Repository: akses database tabel 'notification_logs' dan 'projects' (callback-log-service)

export async function updateLogStatus(messageId, statusData) {
  const { error } = await supabase
    .from('notification_logs')
    .update(statusData)
    .eq('message_id', messageId);
  if (error) throw error;
}

export async function findProjectWebhook(projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select('webhook_url, webhook_secret')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findRecentLogs(limit = 100) {
  const { data, error } = await supabase
    .from('notification_logs')
    .select('*, projects(name)')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function findAllLogStats() {
  const { data, error } = await supabase
    .from('notification_logs')
    .select('status, channel');
  if (error) throw error;
  return data;
}
