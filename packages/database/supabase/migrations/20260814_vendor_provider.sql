-- =============================================================================
-- MIGRATION: Kolom provider pada tabel vendors (BAILEYS | NODEMAILER)
-- =============================================================================

ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS provider VARCHAR(20) NOT NULL DEFAULT 'NODEMAILER';

-- Vendor WhatsApp legacy diasumsikan Baileys setelah migrasi integrasi
UPDATE public.vendors SET provider = 'BAILEYS' WHERE channel = 'WHATSAPP';

CREATE INDEX IF NOT EXISTS idx_vendors_provider ON public.vendors(provider);
