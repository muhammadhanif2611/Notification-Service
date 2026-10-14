import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Helper pencari lokasi file environment (.env.local diprioritaskan di atas .env)
const locateEnvironmentFile = (filename = '.env') => {
  let currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  while (currentDirectory !== path.parse(currentDirectory).root) {
    const environmentPath = path.join(currentDirectory, filename);
    if (fs.existsSync(environmentPath)) return environmentPath;
    currentDirectory = path.dirname(currentDirectory);
  }
  return null;
};

// 1. Muat .env sebagai base
const baseEnv = locateEnvironmentFile('.env');
if (baseEnv) dotenv.config({ path: baseEnv });

// 2. Muat .env.local untuk override lokal jika ada
const localEnv = locateEnvironmentFile('.env.local');
if (localEnv) dotenv.config({ path: localEnv, override: true });

const supabaseUrl = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

// Client utama database Supabase
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false }
});

// Dukungan koneksi PostgREST standalone di Railway (menghilangkan prefix /rest/v1 jika diarahkan langsung ke port PostgREST)
if (process.env.POSTGREST_DIRECT === 'true' || process.env.POSTGREST_URL) {
  const restUrl = (process.env.POSTGREST_URL || supabaseUrl).replace(/\/+$/, '');
  supabase.rest.url = restUrl;
}

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
