import { supabase } from '@notification-gateway/database';

// Repository: akses database tabel 'notification_logs' (dispatch-service)

export async function updateStatusByMessageId(messageId, statusData) {
  const { error } = await supabase
    .from('notification_logs')
    .update(statusData)
    .eq('message_id', messageId);
  if (error) throw error;
}

// Hanya dipakai channel EMAIL — WhatsApp (Baileys) tidak memakai vendor credentials.
export async function findActiveVendorByChannel(channel) {
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .eq('channel', channel)
    .eq('is_active', true)
    .order('priority', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
