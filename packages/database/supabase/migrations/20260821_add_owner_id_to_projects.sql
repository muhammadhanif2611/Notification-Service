-- =============================================================================
-- MIGRATION: Tambah kolom owner_id pada tabel projects (Multi-Tenancy)
-- =============================================================================
-- Tujuan: Mengisolasi data per client. Setiap project dimiliki oleh 1 user.
-- Client hanya bisa melihat/mengelola project miliknya sendiri.
-- Admin bisa melihat semua project.
-- =============================================================================

-- 1. Tambah kolom owner_id ke tabel projects
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 2. Index untuk performa query per-owner
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);

-- 3. (Opsional) Backfill: assign project existing ke admin pertama
--    Uncomment jika ingin project lama dimiliki admin:
-- UPDATE public.projects 
-- SET owner_id = (SELECT id FROM public.profiles WHERE role = 'admin' LIMIT 1)
-- WHERE owner_id IS NULL;