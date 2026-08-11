import { supabase } from '@notification-gateway/database';

// Repository: akses database tabel 'profiles'

export async function findByEmail(email) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findActiveByEmail(email) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function insert(profileData) {
  const { data, error } = await supabase
    .from('profiles')
    .insert(profileData)
    .select('id, email, name, role, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function updateLastLogin(userId) {
  await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);
}
