-- =============================================================================
-- MIGRATION: Tambah kolom owner_id untuk Multi-Tenancy
-- =============================================================================
-- Jalankan di: https://supabase.com → Project → SQL Editor → New Query
-- =============================================================================

-- Step 1: Tambah kolom owner_id
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Step 2: Buat index untuk performa query
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);

-- Step 3: Backfill — assign project existing ke admin pertama
-- (Agar project lama tidak "yatim piatu")
UPDATE public.projects 
SET owner_id = (SELECT id FROM public.profiles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1)
WHERE owner_id IS NULL;

-- Step 4: Verifikasi
SELECT 
  p.id, 
  p.name, 
  p.slug, 
  p.owner_id,
  pr.name as owner_name,
  pr.email as owner_email
FROM public.projects p
LEFT JOIN public.profiles pr ON p.owner_id = pr.id
ORDER BY p.created_at DESC;