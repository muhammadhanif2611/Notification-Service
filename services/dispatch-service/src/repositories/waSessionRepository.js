import { supabase } from '@notification-gateway/database';

// Repository: akses data project untuk keperluan scoping sesi WhatsApp

/**
 * Mengambil daftar project milik satu owner (client user).
 * @param {string} ownerId
 * @returns {Promise<Array<object>>}
 */
export async function findProjectsByOwnerId(ownerId) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Mengambil daftar seluruh project (untuk monitoring admin).
 * @returns {Promise<Array<object>>}
 */
export async function findAllProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, slug')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Memastikan project ada dan dimiliki oleh owner tertentu.
 * @param {string} projectId
 * @param {string} ownerId
 * @returns {Promise<object|null>} Project jika valid, null jika bukan pemilik
 */
export async function findOwnedProject(projectId, ownerId) {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, slug')
    .eq('id', projectId)
    .eq('owner_id', ownerId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
