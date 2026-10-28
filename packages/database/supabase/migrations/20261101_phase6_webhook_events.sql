-- Migrasi: kolom webhook_events pada projects untuk filter event webhook klien

ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS webhook_events JSONB DEFAULT '["message.delivered", "message.failed"]'::jsonb;
