-- =============================================================================
-- MIGRATION: Tabel webhooks_log (Fase 2/Fase 5) — Audit pengiriman callback webhook
-- =============================================================================

-- Tabel: webhooks_log (Menyimpan histori pengiriman callback webhook ke App Klien)
CREATE TABLE IF NOT EXISTS public.webhooks_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID REFERENCES public.notification_logs(id) ON DELETE CASCADE,
    message_id VARCHAR(100), -- referensi cepat ke notification_logs.message_id
    webhook_url TEXT NOT NULL,
    payload_sent JSONB NOT NULL,
    signature VARCHAR(255), -- Nilai HMAC SHA-256 (X-Gateway-Signature)
    http_status INT, -- respons dari server klien
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing untuk performa query
CREATE INDEX IF NOT EXISTS idx_webhooks_log_notification ON public.webhooks_log(notification_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_log_message ON public.webhooks_log(message_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_log_created ON public.webhooks_log(created_at);
