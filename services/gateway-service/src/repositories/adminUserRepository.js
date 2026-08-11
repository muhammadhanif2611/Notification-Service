import { supabase } from '@notification-gateway/database';

// Repository: akses database tabel 'admin_users' (gateway-service)

export async function findActiveByEmail(email) {
  const { data, error } = await supabase
    .from('admin_users')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateLastLogin(userId) {
  await supabase
    .from('admin_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);
}
