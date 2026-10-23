#!/usr/bin/env node
/**
 * Script untuk inisialisasi / migrasi database PostgreSQL di Railway
 * Usage:
 *   node scripts/migrate-railway.js "<DATABASE_URL>"
 *   npm run migrate:railway -- "<DATABASE_URL>"
 *   atau set DATABASE_URL di .env.local lalu jalankan: npm run migrate:railway
 *   Existing database: npm run migrate:template-review
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Muat .env atau .env.local
const rootDir = join(__dirname, '..');
if (existsSync(join(rootDir, '.env'))) dotenv.config({ path: join(rootDir, '.env') });
if (existsSync(join(rootDir, '.env.local'))) dotenv.config({ path: join(rootDir, '.env.local'), override: true });

// Gabungkan argumen jika npm/PowerShell memecah string URL di karakter '@'
const templateReviewOnly = process.argv.includes('--template-review-only');
let rawArgs = process.argv.slice(2).filter((arg) => arg !== '--template-review-only').join('');
rawArgs = rawArgs.replace(/^["']+|["']+$/g, '').trim();

// Prioritas: Argumen CLI > DATABASE_PUBLIC_URL (akses luar Railway) > DATABASE_URL
let databaseUrl = rawArgs || process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL;

async function main() {
  console.log('\n🚂 Notification Gateway — Railway Database Migration');
  console.log('====================================================\n');

  const migrationPath = join(rootDir, 'packages', 'database', 'supabase', 'migrations');
  const removeApprovalMigrationPath = join(migrationPath, '20261023_remove_template_approval.sql');
  const sqlFilePath = templateReviewOnly ? removeApprovalMigrationPath : join(__dirname, 'railway-init.sql');
  if (!existsSync(sqlFilePath)) {
    console.error(`❌ File ${sqlFilePath} tidak ditemukan.`);
    process.exit(1);
  }

  const sql = readFileSync(sqlFilePath, 'utf8');

  // Cek apakah user masih memasukkan placeholder
  if (databaseUrl && (databaseUrl.includes('PASSWORD@HOST:PORT') || databaseUrl.includes('HOST:PORT') || databaseUrl.includes(':PASSWORD@'))) {
    console.log('⚠️  URL yang Anda masukkan masih mengandung placeholder ("PASSWORD@HOST:PORT").');
    console.log('   Anda harus menggantinya dengan URL koneksi asli dari Railway!\n');
    console.log('📍 Cara mengambil URL asli:');
    console.log('   1. Buka dashboard Railway → Klik service PostgreSQL');
    console.log('   2. Buka tab "Connect"');
    console.log('   3. Salin nilai "Database URL" atau "Public Connection URL" (TCP Proxy)\n');
    console.log('💡 Contoh URL asli dari Railway:');
    console.log('   postgresql://postgres:w9J8xK...dummy...@junction.proxy.rlwy.net:12345/railway\n');
    process.exit(1);
  }

  // Cek jika databaseUrl kosong
  if (!databaseUrl) {
    console.log('⚠️  DATABASE_URL tidak ditemukan.');
    console.log('\nCara 1 (Otomatis via Terminal):');
    console.log('  node scripts/migrate-railway.js "postgresql://postgres:password_asli@host_asli:port_asli/railway"\n');
    console.log('Cara 2 (Simpan di .env.local):');
    console.log('  Tambahkan baris berikut di file .env.local:');
    console.log('  DATABASE_URL=postgresql://postgres:password_asli@host_asli:port_asli/railway');
    console.log('  Lalu jalankan cukup: npm run migrate:railway\n');
    process.exit(0);
  }

  // Peringatan jika menggunakan domain private .railway.internal dari mesin lokal
  if (databaseUrl.includes('.railway.internal')) {
    console.log('⚠️  Catatan: URL Anda menggunakan domain ".railway.internal".');
    console.log('   Domain ini hanya dapat diakses dari dalam server Railway.');
    console.log('   Jika Anda menjalankan perintah ini dari laptop/lokal, gunakan URL koneksi publik');
    console.log('   dari tab "Connect" (biasanya berakhiran .proxy.rlwy.net).\n');
  }

  console.log('📡 Menghubungkan ke PostgreSQL Railway...');

  let pg;
  try {
    pg = await import('pg');
  } catch {
    console.log('\n⚠️  Package "pg" belum terpasang.');
    console.log('Pasang dengan: npm install --save-dev pg\n');
    process.exit(1);
  }

  const { Client } = pg.default || pg;
  const client = new Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('railway') || databaseUrl.includes('sslmode=require') 
      ? { rejectUnauthorized: false } 
      : false
  });

  try {
    await client.connect();
    console.log('✅ Berhasil terhubung ke database.');
    console.log(`⏳ Menjalankan ${templateReviewOnly ? 'migrasi penghapusan approval template' : 'inisialisasi skema Railway'}...\n`);

    await client.query(sql);
    await client.query(readFileSync(removeApprovalMigrationPath, 'utf8'));
    console.log('Skema template tanpa approval dan monitoring client siap.');

    console.log('====================================================');
    console.log('✅ Migrasi skema Railway PostgreSQL BERHASIL!');
    console.log('   - Tabel: profiles, projects, api_keys, templates, vendors');
    console.log('   - Tabel: notification_logs, webhooks_log, audit_logs');
    console.log('   - RPC: get_notification_log_stats');
    console.log('   - Hak akses: role anon PostgREST');
    console.log('====================================================\n');
  } catch (err) {
    console.error('❌ Gagal menjalankan migrasi:', err.message);
    if (err.message.includes('password') || err.message.includes('authentication')) {
      console.log('\n💡 Tips: Periksa kembali password PostgreSQL Railway Anda.');
    } else if (err.message.includes('ENOTFOUND') || err.message.includes('ETIMEDOUT')) {
      console.log('\n💡 Tips: Pastikan host dan port benar, dan gunakan URL publik jika terhubung dari luar Railway.');
    }
    process.exit(1);
  } finally {
    try {
      await client.end();
    } catch {}
  }
}

main().catch(console.error);
