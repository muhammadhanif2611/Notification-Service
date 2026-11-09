import { supabase } from '@notification-gateway/database';

// Repository akses database untuk log notifikasi, statistik, webhook log, dan suppression list.
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

export async function findRecentLogs({ projectId = null, channel = null, statuses = null, limit = 100, page = 1 } = {}) {
  let query = supabase
    .from('notification_logs')
    .select('*, projects(name, slug)')
    .order('created_at', { ascending: false });

  if (projectId) query = query.eq('project_id', projectId);
  if (channel) query = query.eq('channel', channel);
  if (statuses?.length) query = query.in('status', statuses);

  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function findLogStats(projectId = null) {
  const { data, error } = await supabase.rpc('get_notification_log_stats', {
    p_project_id: projectId || null
  });
  if (error) throw error;
  return data;
}

export async function findLogIdByMessageId(messageId) {
  const { data, error } = await supabase
    .from('notification_logs')
    .select('id')
    .eq('message_id', messageId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

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

const SENT_STATUSES = ['SENT', 'DELIVERED', 'READ'];
const QUEUED_STATUSES = ['PENDING', 'QUEUED', 'PROCESSING'];

export async function findDailyTrend(projectId = null, days = 7) {
  const { data, error } = await supabase.rpc('get_notification_daily_trend', {
    p_project_id: projectId || null,
    p_days: days
  });
  if (error) throw error;

  const hasActivity = data?.some(
    (r) => Number(r.delivered) > 0 || Number(r.queued) > 0 || Number(r.failed) > 0
  );
  if (hasActivity) return data;

  let latestQuery = supabase
    .from('notification_logs')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(1);
  if (projectId) latestQuery = latestQuery.eq('project_id', projectId);

  const { data: latestRows } = await latestQuery;
  if (!latestRows?.length) return data || [];

  const endDayStr = new Date(latestRows[0].created_at).toISOString().slice(0, 10);
  const endDate = new Date(`${endDayStr}T23:59:59.999Z`);
  const startDate = new Date(endDate.getTime() - (days - 1) * 86400000);
  const startIso = `${startDate.toISOString().slice(0, 10)}T00:00:00.000Z`;

  let logsQuery = supabase
    .from('notification_logs')
    .select('created_at, status')
    .gte('created_at', startIso)
    .lte('created_at', endDate.toISOString());
  if (projectId) logsQuery = logsQuery.eq('project_id', projectId);

  const { data: logs } = await logsQuery;
  const buckets = new Map();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(endDate.getTime() - i * 86400000).toISOString().slice(0, 10);
    buckets.set(d, { day: d, delivered: 0, queued: 0, failed: 0 });
  }

  for (const row of logs || []) {
    const dayKey = new Date(row.created_at).toISOString().slice(0, 10);
    const bucket = buckets.get(dayKey);
    if (!bucket) continue;
    if (SENT_STATUSES.includes(row.status)) bucket.delivered += 1;
    else if (QUEUED_STATUSES.includes(row.status)) bucket.queued += 1;
    else if (row.status === 'FAILED') bucket.failed += 1;
  }

  return Array.from(buckets.values());
}

export async function findChannelBreakdown(projectId = null) {
  const { data, error } = await supabase.rpc('get_notification_channel_breakdown', {
    p_project_id: projectId || null
  });
  if (error) throw error;
  return data;
}

function computeAvgLatencyMs(rows) {
  if (!rows?.length) return 0;
  let validCount = 0;
  const totalMs = rows.reduce((sum, row) => {
    const diff = new Date(row.sent_at) - new Date(row.created_at);
    if (diff >= 0) {
      validCount += 1;
      return sum + diff;
    }
    return sum;
  }, 0);
  return validCount > 0 ? Math.round(totalMs / validCount) : 0;
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
  if (!error && data?.length) {
    return computeAvgLatencyMs(data);
  }

  let fallbackQuery = supabase
    .from('notification_logs')
    .select('created_at, sent_at')
    .not('sent_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200);
  if (projectId) fallbackQuery = fallbackQuery.eq('project_id', projectId);

  const { data: fallbackData, error: fallbackError } = await fallbackQuery;
  if (fallbackError || !fallbackData?.length) return 0;
  return computeAvgLatencyMs(fallbackData);
}

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
