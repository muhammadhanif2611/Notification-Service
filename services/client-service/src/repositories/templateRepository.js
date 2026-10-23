import { supabase } from '@notification-gateway/database';

export async function findAll(projectId = null, ownerId = null) {
  let query = supabase.from('templates').select('*, projects!inner(id, name, owner_id, profiles(name, email))');
  if (projectId) query = query.eq('project_id', projectId);
  if (ownerId) query = query.eq('projects.owner_id', ownerId);
  const { data, error } = await query.order('created_at', { ascending: false });
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

export async function updateById(templateId, updateData, updatedAt) {
  const { data, error } = await supabase
    .from('templates')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .eq('updated_at', updatedAt)
    .select()
    .maybeSingle();
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
