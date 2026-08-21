#!/usr/bin/env node
/**
 * Script untuk mendaftarkan SMTP Vendor ke database
 * Usage: node scripts/setup-smtp-vendor.js
 */

import { createClient } from '@supabase/supabase-js';
import { encryptAES } from '@notification-gateway/shared';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => rl.question(prompt, resolve));
}

async function main() {
  console.log('📧 Setup SMTP Vendor untuk Email Notification');
  console.log('=============================================\n');

  // Cek existing vendor
  const { data: existing } = await supabase
    .from('vendors')
    .select('*')
    .eq('channel', 'EMAIL')
    .eq('is_active', true)
    .single();

  if (existing) {
    console.log('⚠️  SMTP Vendor sudah terdaftar:');
    console.log(`   Name: ${existing.name}`);
    console.log(`   Priority: ${existing.priority}`);
    console.log(`   Created: ${existing.created_at}\n`);
    
    const overwrite = await question('Overwrite existing vendor? (y/N): ');
    if (overwrite.toLowerCase() !== 'y') {
      console.log('Aborted.');
      rl.close();
      return;
    }
    
    // Deactivate existing
    await supabase.from('vendors').update({ is_active: false }).eq('id', existing.id);
    console.log('Existing vendor deactivated.\n');
  }

  console.log('Masukkan konfigurasi SMTP:\n');
  
  const host = await question('SMTP Host (e.g., smtp.gmail.com): ') || 'smtp.gmail.com';
  const port = parseInt(await question('SMTP Port (default 587): ') || '587');
  const user = await question('SMTP User (email): ');
  const pass = await question('SMTP Password (App Password): ');
  const from = await question('From Address (e.g., "App Name <noreply@app.com>"): ') || user;
  const name = await question('Vendor Name (default: Gmail SMTP): ') || 'Gmail SMTP';

  if (!user || !pass) {
    console.error('❌ SMTP User dan Password wajib diisi!');
    rl.close();
    process.exit(1);
  }

  const credentials = { host, port, secure: false, user, pass, from };
  const encrypted = encryptAES(JSON.stringify(credentials));

  const { data, error } = await supabase.from('vendors').insert({
    name,
    channel: 'EMAIL',
    provider: 'NODEMAILER',
    credential_encrypted: encrypted.encryptedData,
    credential_iv: encrypted.iv,
    credential_auth_tag: encrypted.authTag,
    priority: 1,
    is_active: true
  }).select().single();

  if (error) {
    console.error('❌ Error:', error.message);
    rl.close();
    process.exit(1);
  }

  console.log('\n✅ SMTP Vendor berhasil didaftarkan!');
  console.log(`   ID: ${data.id}`);
  console.log(`   Name: ${data.name}`);
  console.log(`   Channel: ${data.channel}`);
  console.log('\nSekarang Anda bisa mengirim email melalui API.');
  
  rl.close();
}

main().catch(console.error);