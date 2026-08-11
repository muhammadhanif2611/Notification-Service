import { supabase } from '@notification-gateway/database';

// Repository: akses database tabel 'projects' (notification-service)

export async function findByIdWithQuota(projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, daily_quota, rate_limit_per_min, is_active')
    .eq('id', projectId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
