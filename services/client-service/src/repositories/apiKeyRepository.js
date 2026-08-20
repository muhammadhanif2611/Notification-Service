import { supabase } from '@notification-gateway/database';

// Repository: akses database tabel 'api_keys'

const API_KEY_SELECT = 'id, project_id, name, key_prefix, key_preview, environment, is_active, created_at';

export async function findByIdWithProject(keyId) {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*, projects(slug, name)')
    .eq('id', keyId)
    .single();
  if (error) throw error;
  return data;
}

export async function findAll() {
  const { data, error } = await supabase
    .from('api_keys')
    .select(`${API_KEY_SELECT}, projects(name, slug)`)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function insert(keyData) {
  const { data, error } = await supabase
    .from('api_keys')
    .insert(keyData)
    .select(API_KEY_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function updateById(keyId, updateData, selectFields = API_KEY_SELECT) {
  const { data, error } = await supabase
    .from('api_keys')
    .update(updateData)
    .eq('id', keyId)
    .select(selectFields)
    .single();
  if (error) throw error;
  return data;
}

export async function deleteById(keyId) {
  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', keyId);
  if (error) throw error;
}
