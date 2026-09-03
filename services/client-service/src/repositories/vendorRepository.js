import { supabase } from '@notification-gateway/database';

// Repository: akses database tabel 'vendors'

const VENDOR_METADATA = 'id, name, channel, priority, is_active, created_at';

export async function findAllOrderedByPriority() {
  const { data, error } = await supabase
    .from('vendors')
    .select(VENDOR_METADATA)
    .order('priority', { ascending: true });
  if (error) throw error;
  return data;
}

export async function insert(vendorData) {
  const { data, error } = await supabase
    .from('vendors')
    .insert(vendorData)
    .select(VENDOR_METADATA)
    .single();
  if (error) throw error;
  return data;
}

export async function updateById(vendorId, updateData) {
  const { data, error } = await supabase
    .from('vendors')
    .update(updateData)
    .eq('id', vendorId)
    .select(VENDOR_METADATA)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function deleteById(vendorId) {
  const { data, error } = await supabase
    .from('vendors')
    .delete()
    .eq('id', vendorId)
    .select('id')
    .maybeSingle();
  if (error) throw error;
  return data;
}
