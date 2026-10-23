import { supabase } from '@notification-gateway/database';

export async function findClients({ page, limit, search, status, usage }) {
  let query = supabase.from('admin_client_overview').select('*', { count: 'exact' });
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
  if (status !== 'all') query = query.eq('is_active', status === 'active');
  if (usage !== 'all') query = query.eq('has_api_activity', usage === 'used');
  const [result, totals] = await Promise.all([
    query.order('created_at', { ascending: false }).order('id').range((page - 1) * limit, page * limit - 1),
    supabase.from('admin_client_summary').select('*').single(),
  ]);
  const { data, error, count } = result;
  if (error) throw error;
  if (totals.error) throw totals.error;
  return { clients: data || [], total: count || 0, page, limit, summary: totals.data };
}

export async function findClient(id) {
  const { data, error } = await supabase.from('admin_client_overview').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function findClientProjects(id) {
  const { data, error } = await supabase.from('admin_project_usage').select('*')
    .eq('owner_id', id).order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
