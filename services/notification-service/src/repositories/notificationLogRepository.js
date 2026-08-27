import { supabase } from '@notification-gateway/database';
import { NOTIFICATION_STATUS } from '@notification-gateway/shared';

// Repository: akses database tabel 'notification_logs'

export async function countTodayByProject(projectId) {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('notification_logs')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .gte('created_at', todayStart.toISOString());
  if (error) throw error;
  return count || 0;
}

export async function insert(logData) {
  const { data, error } = await supabase
    .from('notification_logs')
    .insert({
      ...logData,
      status: NOTIFICATION_STATUS.QUEUED
    })
    .select('id, message_id, status, created_at')
    .single();
  if (error) throw error;
  return data;
}

// Batch insert banyak log notifikasi sekaligus (untuk broadcast) — 1 query, bukan N query
export async function insertMany(logsData) {
  const rows = logsData.map((logData) => ({
    ...logData,
    status: NOTIFICATION_STATUS.QUEUED
  }));
  const { error } = await supabase.from('notification_logs').insert(rows);
  if (error) throw error;
}

export async function findPaginated({ projectId, page, limit, status, channel }) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('notification_logs')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status) query = query.eq('status', status.toUpperCase());
  if (channel) query = query.eq('channel', channel.toUpperCase());

  const { data, count, error } = await query;
  if (error) throw error;
  return { data, count };
}

export async function findByMessageId(messageId) {
  const { data, error } = await supabase
    .from('notification_logs')
    .select('*')
    .eq('message_id', messageId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
