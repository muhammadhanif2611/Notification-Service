import { supabase } from '@notification-gateway/database';

// Repository akses database tabel 'api_keys' untuk autentikasi API Key pada gateway-service.
export async function findActiveByPrefixAndPreview(keyPrefix, keyPreview) {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*, projects(*, profiles(is_active))')
    .eq('key_prefix', keyPrefix)
    .eq('key_preview', keyPreview)
    .eq('is_active', true);
  if (error) throw error;
  return data;
}

export async function updateLastUsed(keyId) {
  await supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyId);
}
