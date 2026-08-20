import { supabase } from '@notification-gateway/database';

/**
 * Repository layer untuk akses database tabel 'profiles'.
 * Semua query database untuk user profiles ada di sini.
 */

/**
 * Cari profile berdasarkan email.
 * @param {string} email - Email user
 * @returns {Promise<Object|null>} Profile object atau null
 */
export async function findByEmail(email) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Cari active profile berdasarkan email.
 * @param {string} email - Email user
 * @returns {Promise<Object|null>} Profile object atau null
 */
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

/**
 * Insert profile baru.
 * @param {Object} profileData - Data profile (email, password_hash, name, role)
 * @returns {Promise<Object>} Created profile
 */
export async function insert(profileData) {
  const { data, error } = await supabase
    .from('profiles')
    .insert(profileData)
    .select('id, email, name, role, created_at')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Update last login timestamp.
 * @param {string} userId - User ID
 */
export async function updateLastLogin(userId) {
  await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId);
}

/**
 * Ambil daftar semua profile (untuk admin).
 * @returns {Promise<Array>} Array of profiles
 */
export async function findAll() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, name, role, is_active, last_login_at, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Update status aktif profile.
 * @param {string} id - User ID
 * @param {boolean} isActive - Status aktif
 * @returns {Promise<Object>} Updated profile
 */
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

/**
 * Hapus profile.
 * @param {string} id - User ID
 * @returns {Promise<boolean>} Success status
 */
export async function remove(id) {
  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return true;
}

/**
 * Update profile (untuk admin edit).
 * @param {string} id - User ID
 * @param {Object} updateData - Data yang akan diupdate
 * @returns {Promise<Object>} Updated profile
 */
export async function update(id, updateData) {
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, email, name, role, is_active, created_at')
    .single();
  if (error) throw error;
  return data;
}
