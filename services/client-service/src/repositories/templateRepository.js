import { supabase } from '@notification-gateway/database';

// Repository: akses database tabel 'templates'

export async function findAll(projectId = null) {
  let query = supabase.from('templates').select('*, projects(name)');
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function insert(templateData) {
  const { data, error } = await supabase
    .from('templates')
    .insert(templateData)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function findById(templateId) {
  const { data, error } = await supabase
    .from('templates')
    .select('*')
    .eq('id', templateId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateStatusById(templateId, statusData) {
  const { data, error } = await supabase
    .from('templates')
    .update(statusData)
    .eq('id', templateId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateById(templateId, updateData) {
  const { data, error } = await supabase
    .from('templates')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteById(templateId) {
  const { error } = await supabase
    .from('templates')
    .delete()
    .eq('id', templateId);
  if (error) throw error;
}
