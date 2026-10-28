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
    .select('webhook_url, webhook_secret, webhook_events')
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

// Tren harian pengiriman (delivered/queued/failed) via RPC GROUP BY tanggal
export async function findDailyTrend(projectId = null, days = 7) {
  const { data, error } = await supabase.rpc('get_notification_daily_trend', {
    p_project_id: projectId || null,
    p_days: days
  });
  if (error) throw error;
  return data;
}

export async function findChannelBreakdown(projectId = null) {
  const { data, error } = await supabase.rpc('get_notification_channel_breakdown', {
    p_project_id: projectId || null
  });
  if (error) throw error;
  return data;
}

export async function findAvgLatency(projectId = null, days = 7) {
  const since = new Date(Date.now() - days * 86400000).toISOString();
  let query = supabase
    .from('notification_logs')
    .select('created_at, sent_at')
    .not('sent_at', 'is', null)
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(200);

  if (projectId) query = query.eq('project_id', projectId);

  const { data, error } = await query;
  if (error || !data?.length) return 0;

  const totalMs = data.reduce((sum, row) => {
    const diff = new Date(row.sent_at) - new Date(row.created_at);
    return diff >= 0 ? sum + diff : sum;
  }, 0);
  return Math.round(totalMs / data.length);
}

// ── Suppression List ────────────────────────────────────────────────────────

export async function findSuppressions(channel = null) {
  let query = supabase.from('suppression_list').select('*').order('created_at', { ascending: false });
  if (channel && channel !== 'ALL') query = query.eq('channel', channel);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function findSuppressionById(id) {
  const { data, error } = await supabase
    .from('suppression_list').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function insertSuppression({ contact, channel, reason, sourceLogId = null, notes = null }) {
  const { data, error } = await supabase
    .from('suppression_list')
    .upsert({ contact, channel, reason, source_log_id: sourceLogId, notes }, { onConflict: 'contact,channel' })
    .select().single();
  if (error) throw error;
  return data;
}

export async function deleteSuppression(id) {
  const { error } = await supabase.from('suppression_list').delete().eq('id', id);
  if (error) throw error;
}

// ── Alert Rules & History ───────────────────────────────────────────────────

export async function findAlertRules() {
  const { data, error } = await supabase
    .from('alert_rules').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function insertAlertRule(rule) {
  const { data, error } = await supabase.from('alert_rules').insert(rule).select().single();
  if (error) throw error;
  return data;
}

export async function updateAlertRule(id, updateData) {
  const { data, error } = await supabase
    .from('alert_rules')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteAlertRule(id) {
  const { error } = await supabase.from('alert_rules').delete().eq('id', id);
  if (error) throw error;
}

export async function findAlertHistory(limit = 50) {
  const { data, error } = await supabase
    .from('alert_history').select('*').order('created_at', { ascending: false }).limit(limit);
  if (error) throw error;
  return data;
}

export async function insertAlertHistory(entry) {
  const { data, error } = await supabase.from('alert_history').insert(entry).select().single();
  if (error) throw error;
  return data;
}

export async function resolveAlertHistory(id) {
  const { data, error } = await supabase
    .from('alert_history').update({ resolved: true }).eq('id', id).select().maybeSingle();
  if (error) throw error;
  return data;
}

export async function incrementRuleTrigger(id) {
  const { data: rule, error: findError } = await supabase
    .from('alert_rules').select('trigger_count').eq('id', id).maybeSingle();
  if (findError) throw findError;
  const { error } = await supabase
    .from('alert_rules')
    .update({ trigger_count: (rule?.trigger_count || 0) + 1, last_triggered_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}
