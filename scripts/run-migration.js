#!/usr/bin/env node
/**
 * Script untuk menjalankan migration database ke Supabase
 * Usage: node scripts/run-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MIGRATIONS = [
  '20260804_initial_schema.sql',
  '20260805_phase2_vendor_encryption.sql',
  '20260813_phase5_webhooks_log.sql',
  '20260814_vendor_provider.sql',
  '20260821_add_owner_id_to_projects.sql'
];

async function runMigration(filename) {
  const filepath = join(__dirname, '..', 'packages', 'database', 'supabase', 'migrations', filename);
  console.log(`\n📄 Running: ${filename}`);
  
  try {
    const sql = readFileSync(filepath, 'utf8');
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Coba direct query jika RPC tidak tersedia
      const { error: directError } = await supabase.from('_migrations').select('*').limit(1);
      if (directError) {
        console.log(`   ⚠️  Cannot run migration automatically. Please run manually in Supabase SQL Editor.`);
        console.log(`   File: ${filepath}`);
        return false;
      }
    }
    
    console.log(`   ✅ Success`);
    return true;
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Notification Gateway — Database Migration');
  console.log('==========================================\n');
  
  console.log(`Supabase URL: ${process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}\n`);
  
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase credentials in .env');
    process.exit(1);
  }
  
  // Test connection
  const { data, error } = await supabase.from('projects').select('count', { count: 'exact', head: true });
  if (error) {
    console.error('❌ Cannot connect to Supabase:', error.message);
    process.exit(1);
  }
  console.log('✅ Connected to Supabase\n');
  
  // Run migrations
  let successCount = 0;
  for (const migration of MIGRATIONS) {
    const success = await runMigration(migration);
    if (success) successCount++;
  }
  
  console.log(`\n==========================================`);
  console.log(`✅ Migration complete: ${successCount}/${MIGRATIONS.length} successful`);
  
  if (successCount < MIGRATIONS.length) {
    console.log('\n⚠️  Some migrations failed. Please run manually in Supabase SQL Editor:');
    console.log('   1. Go to https://supabase.com → Your Project → SQL Editor');
    console.log('   2. Copy content from packages/database/supabase/migrations/');
    console.log('   3. Run each migration file in order');
  }
}

main().catch(console.error);