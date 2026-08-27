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

export async function findRecentLogs({ projectId = null, limit = 100, page = 1 } = {}) {
  let query = supabase
    .from('notification_logs')
    .select('*, projects(name, slug)')
    .order('created_at', { ascending: false });

  if (projectId) {
    query = query.eq('project_id', projectId);
  }

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Statistik agregat via SQL GROUP BY — tidak fetch seluruh row ke memori
export async function findLogStats(projectId = null) {
  const { data, error } = await supabase.rpc('get_notification_log_stats', {
    p_project_id: projectId || null
  });
  if (error) throw error;
  return data;
}

// Mengambil id internal log notifikasi berdasarkan message_id
export async function findLogIdByMessageId(messageId) {
  const { data, error } = await supabase
    .from('notification_logs')
    .select('id')
    .eq('message_id', messageId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// Memperbarui status notifikasi dari provider webhook (DELIVERED/READ/FAILED dll)
export async function updateStatusByProvider(messageId, status, extraFields = {}) {
  const updatePayload = { status, updated_at: new Date().toISOString(), ...extraFields };
  if (status === 'DELIVERED') updatePayload.delivered_at = new Date().toISOString();
  if (status === 'READ') updatePayload.read_at = new Date().toISOString();
  const { error } = await supabase
    .from('notification_logs')
    .update(updatePayload)
    .eq('message_id', messageId);
  if (error) throw error;
}

// Menyimpan histori pengiriman callback webhook ke tabel webhooks_log
export async function insertWebhookLog({ notificationId = null, messageId = null, webhookUrl, payloadSent, signature, httpStatus = null, deliveredAt = null }) {
  const { error } = await supabase
    .from('webhooks_log')
    .insert({
      notification_id: notificationId,
      message_id: messageId,
      webhook_url: webhookUrl,
      payload_sent: payloadSent,
      signature,
      http_status: httpStatus,
      delivered_at: deliveredAt
    });
  if (error) throw error;
}
