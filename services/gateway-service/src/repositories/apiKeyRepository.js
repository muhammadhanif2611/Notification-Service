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
