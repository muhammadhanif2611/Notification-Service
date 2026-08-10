import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const findEnv = () => {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (dir !== path.parse(dir).root) {
    const envPath = path.join(dir, '.env');
    if (fs.existsSync(envPath)) {
      return envPath;
    }
    dir = path.dirname(dir);
  }
  return null;
};

dotenv.config({ path: findEnv() });

const supabaseUrl = process.env.SUPABASE_URL || 'https://xyzcompany.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

/**
 * Shared Helper: Write an entry to audit_logs table
 */
export async function writeAuditLog({ userId = null, action, targetEntity, detail }) {
  try {
    return await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      target_entity: targetEntity,
      detail
    });
  } catch (err) {
    console.error('[Audit Log Error]:', err.message);
  }
}
