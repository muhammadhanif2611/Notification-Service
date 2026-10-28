-- Migrasi: tabel suppression_list untuk daftar kontak terblokir
-- (hard bounce, spam complaint, unsubscribe) per channel

CREATE TABLE IF NOT EXISTS public.suppression_list (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contact VARCHAR(255) NOT NULL,
    channel VARCHAR(50) NOT NULL, -- 'WHATSAPP' | 'EMAIL'
    reason VARCHAR(50) NOT NULL DEFAULT 'MANUAL', -- 'HARD_BOUNCE' | 'SPAM_COMPLAINT' | 'UNSUBSCRIBE' | 'MANUAL'
    source_log_id UUID REFERENCES public.notification_logs(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(contact, channel)
);

CREATE INDEX IF NOT EXISTS idx_suppression_contact ON public.suppression_list(contact);
CREATE INDEX IF NOT EXISTS idx_suppression_channel ON public.suppression_list(channel);
