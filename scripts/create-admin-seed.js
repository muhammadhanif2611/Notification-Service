#!/usr/bin/env node
/**
 * Helper untuk membuat skrip seed akun Admin baru dengan password terenkripsi bcrypt.
 * Hasilnya disimpan ke scripts/railway-seed.sql (otomatis diabaikan oleh .gitignore).
 *
 * Usage:
 *   node scripts/create-admin-seed.js "admin@domain.com" "password123" "Nama Admin"
 */

import bcrypt from 'bcryptjs';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const email = (process.argv[2] || 'admin@notification.id').toLowerCase().trim();
const rawPassword = process.argv[3] || 'admin12345';
const name = process.argv[4] || 'Administrator';

async function main() {
  console.log('🔐 Men-generate seed akun admin...');
  const hash = await bcrypt.hash(rawPassword, 10);

  const seedSql = `-- =============================================================================
-- NOTIFICATION GATEWAY — INITIAL SEED DATA FOR RAILWAY (LOCAL GENERATED)
-- =============================================================================
-- JANGAN COMMIT FILE INI KE GIT (SUDAH DIABAIKAN DI .gitignore)
-- =============================================================================

-- 1. SEED AKUN ADMIN UTAMA
-- Email:    ${email}
-- Password: (tersimpan sebagai bcrypt hash di bawah)
INSERT INTO public.profiles (id, email, password_hash, name, role, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    '${email}',
    '${hash}',
    '${name}',
    'admin',
    TRUE
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = '${hash}',
    role = 'admin',
    is_active = TRUE;

-- 2. SEED DEFAULT PROJECT
INSERT INTO public.projects (id, owner_id, name, slug, description, rate_limit_per_min, daily_quota, is_active)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Default Project',
    'default-project',
    'Project utama bawaan untuk testing pengiriman notifikasi',
    100,
    5000,
    TRUE
)
ON CONFLICT (slug) DO NOTHING;

-- 3. SEED TEMPLATE CONTOH
INSERT INTO public.templates (project_id, name, code, channel, body, variables)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'OTP Verification WhatsApp',
    'otp-wa',
    'WHATSAPP',
    'Kode verifikasi Anda adalah {{otp}}. Berlaku selama 5 menit. Jangan berikan kode ini kepada siapapun.',
    '["otp"]'::jsonb
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.templates (project_id, name, code, channel, subject, body, variables)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'Welcome Email',
    'welcome-email',
    'EMAIL',
    'Selamat Datang di Layanan Kami, {{name}}!',
    'Halo {{name}}, selamat datang di Notification Gateway. Akun Anda telah siap digunakan.',
    '["name"]'::jsonb
)
ON CONFLICT (code) DO NOTHING;

-- Status akhir agar Railway Web UI Query runner tidak error
SELECT 'Seed data inserted successfully' AS status;
`;

  const outputPath = join(__dirname, 'railway-seed.sql');
  writeFileSync(outputPath, seedSql, 'utf8');

  console.log('✅ File seed berhasil dibuat: scripts/railway-seed.sql');
  console.log(`   Email Admin: ${email}`);
  console.log(`   Password   : ${rawPassword}`);
  console.log('   (File scripts/railway-seed.sql sudah otomatis diabaikan oleh .gitignore dan aman dari git commit)\n');
  console.log('👉 Sekarang copy isi scripts/railway-seed.sql ke Railway Dashboard → Postgres → Data → Query untuk menjalankannya.');
}

main().catch(console.error);
