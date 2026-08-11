import { supabase } from '@notification-gateway/database';

// Repository: akses database tabel 'notification_logs' (gateway-service)

export async function insert(logData) {
  const { data, error } = await supabase
    .from('notification_logs')
    .insert(logData);
  if (error) throw error;
  return data;
}
