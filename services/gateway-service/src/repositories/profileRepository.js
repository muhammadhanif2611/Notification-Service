import { supabase } from '@notification-gateway/database';

export async function findAccessById(id) {
  const { data, error } = await supabase.from('profiles').select('id, role, is_active').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}
