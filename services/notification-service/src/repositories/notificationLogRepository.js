import { supabase } from '@notification-gateway/database';
import { NOTIFICATION_STATUS } from '@notification-gateway/shared';

// Repository akses database tabel 'notification_logs' dan 'suppression_list' pada notification-service.
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

export async function insertMany(logsData) {
  const rows = logsData.map((logData) => ({
    ...logData,
    status: NOTIFICATION_STATUS.QUEUED
  }));
  const { error } = await supabase.from('notification_logs').insert(rows);
  if (error) throw error;
}

export async function findSuppressedContacts(contacts, channel) {
  const { data, error } = await supabase
    .from('suppression_list')
    .select('contact, reason')
    .eq('channel', channel)
    .in('contact', contacts);
  if (error) return [];
  return data || [];
}
