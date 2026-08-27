-- Migration: Hapus konsep status approval pada template
-- Template tidak lagi memerlukan persetujuan admin, sehingga kolom
-- status dan rejection_reason tidak diperlukan lagi.
ALTER TABLE public.templates
  DROP COLUMN IF EXISTS status,
  DROP COLUMN IF EXISTS rejection_reason;
