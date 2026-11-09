import { supabase } from '@notification-gateway/database';

const API_KEY_SELECT = 'id, project_id, name, key_prefix, key_preview, environment, is_active, last_used_at, created_at';

// Repository akses database tabel 'api_keys' pada client-service.
export async function findByIdWithProject(keyId) {
  const { data, error } = await supabase
    .from('api_keys')
    .select('*, projects(slug, name, owner_id)')
    .eq('id', keyId)
    .single();
  if (error) throw error;
  return data;
}

export async function findAll({ ownerId = null, projectId = null } = {}) {
  let query = supabase
    .from('api_keys')
    .select(`${API_KEY_SELECT}, projects!inner(name, slug, owner_id)`)
    .order('created_at', { ascending: false });

  if (ownerId) query = query.eq('projects.owner_id', ownerId);
  if (projectId) query = query.eq('project_id', projectId);

  const { data, error } = await query;
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
