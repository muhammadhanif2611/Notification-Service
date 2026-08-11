-- =============================================================================
-- MIGRATION: Tambah kolom key_preview & revokasi pada api_keys, enkripsi vendors
-- =============================================================================

-- 1. Tambah kolom key_preview dan revoked_at pada tabel api_keys
ALTER TABLE public.api_keys
  ADD COLUMN IF NOT EXISTS key_preview VARCHAR(8),
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- 2. Ubah struktur tabel vendors untuk enkripsi AES-256-GCM
ALTER TABLE public.vendors
  DROP COLUMN IF EXISTS credentials,
  ADD COLUMN IF NOT EXISTS credential_encrypted TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS credential_iv VARCHAR(32) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS credential_auth_tag VARCHAR(32) NOT NULL DEFAULT '';

-- 3. Index tambahan untuk performa
CREATE INDEX IF NOT EXISTS idx_api_keys_project ON public.api_keys(project_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_env ON public.api_keys(environment);
CREATE INDEX IF NOT EXISTS idx_vendors_channel ON public.vendors(channel);