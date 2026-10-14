-- =============================================================================
-- NOTIFICATION GATEWAY — INITIAL SEED DATA TEMPLATE (EXAMPLE)
-- =============================================================================
-- JANGAN MASUKKAN PASSWORD ASLI DI FILE INI KARENA FILE CONTOH INI DI-COMMIT KE GIT.
-- 
-- Untuk membuat seed dengan password Anda sendiri secara aman:
--   node scripts/create-admin-seed.js "admin@perusahaan.com" "password-rahasia-anda"
-- Perintah di atas akan menghasilkan file scripts/railway-seed.sql (otomatis diabaikan git).
-- =============================================================================

-- 1. SEED AKUN ADMIN UTAMA
-- Generate hash bcrypt: node -e "require('bcryptjs').hash('password-anda', 10).then(console.log)"
INSERT INTO public.profiles (id, email, password_hash, name, role, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@example.com',
    '$2a$10$YOUR_BCRYPT_HASH_HERE',
    'Administrator',
    'admin',
    TRUE
)
ON CONFLICT (email) DO UPDATE SET
    role = 'admin',
    is_active = TRUE;

-- 2. SEED DEFAULT PROJECT
INSERT INTO public.projects (id, owner_id, name, slug, description, rate_limit_per_min, daily_quota, is_active)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Default Project',
    'default-project',
    'Project utama bawaan untuk testing notifikasi',
    100,
    5000,
    TRUE
)
ON CONFLICT (slug) DO NOTHING;

-- Status akhir agar Railway Web UI Query runner tidak error
SELECT 'Seed data template completed' AS status;
