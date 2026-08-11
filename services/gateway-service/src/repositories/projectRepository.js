import { supabase } from '@notification-gateway/database';

// Repository: akses database tabel 'projects' (gateway-service)

export async function findAll() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function findSlugById(projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select('slug')
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
