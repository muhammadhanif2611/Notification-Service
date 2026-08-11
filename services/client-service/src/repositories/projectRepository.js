import { supabase } from '@notification-gateway/database';

// Repository: akses database tabel 'projects'

export async function findAll() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function findByIdWithApiKeys(projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select('*, api_keys(id, name, key_prefix, key_preview, environment, last_used_at, is_active, created_at)')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findSlugAndNameById(projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select('slug, name')
    .eq('id', projectId)
    .single();
  if (error) throw error;
  return data;
}

export async function insert(projectData) {
  const { data, error } = await supabase
    .from('projects')
    .insert(projectData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateById(projectId, updateData) {
  const { data, error } = await supabase
    .from('projects')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
