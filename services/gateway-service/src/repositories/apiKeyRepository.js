import { supabase } from '@notification-gateway/database';

// Repository: akses database tabel 'api_keys' (gateway-service)

export async function findActiveByPrefix(keyPrefix) {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*, projects(*)')
    .eq('key_prefix', keyPrefix)
    .eq('is_active', true);
  if (error) throw error;
  return data;
}

// Filter kandidat key berdasarkan key_preview (8 char terakhir) sebelum bcrypt compare —
// menghindari loop bcrypt ke semua key aktif (mahal ~250ms per compare)
export async function findActiveByPrefixAndPreview(keyPrefix, keyPreview) {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*, projects(*)')
    .eq('key_prefix', keyPrefix)
    .eq('key_preview', keyPreview)
    .eq('is_active', true);
  if (error) throw error;
  return data;
}

export async function insert(keyData) {
  const { data, error } = await supabase
    .from('api_keys')
    .insert(keyData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLastUsed(keyId) {
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyId);
}
