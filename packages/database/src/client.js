import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Helper pencari lokasi file environment .env
const locateEnvironmentFile = () => {
  let currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  while (currentDirectory !== path.parse(currentDirectory).root) {
    const environmentPath = path.join(currentDirectory, '.env');
    if (fs.existsSync(environmentPath)) return environmentPath;
    currentDirectory = path.dirname(currentDirectory);
  }
  return null;
};

dotenv.config({ path: locateEnvironmentFile() });

const supabaseUrl = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

// Client utama database Supabase
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// Helper mencatat riwayat audit log sistem
export async function writeAuditLog({ userId = null, action, targetEntity, detail }) {
  try {
    return await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      target_entity: targetEntity,
      detail
    });
  } catch {
    // Kegagalan audit log tidak boleh menghentikan alur utama aplikasi
  }
}
