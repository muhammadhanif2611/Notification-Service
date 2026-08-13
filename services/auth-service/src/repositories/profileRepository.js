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

// Repository: mengambil daftar semua profile (untuk admin)
export async function findAll() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role, is_active, last_login_at, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Repository: mengubah status aktif profile
export async function setActive(id, isActive) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, email, name, role, is_active')
    .single();
  if (error) throw error;
  return data;
}

// Repository: menghapus profile
export async function remove(id) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}
