-- Migrasi: tabel alert_rules & alert_history untuk Threshold Alert admin

CREATE TABLE IF NOT EXISTS public.alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    description TEXT,
    metric VARCHAR(50) NOT NULL, -- 'failure_rate' | 'queue_pending' | 'avg_latency' | 'vendor_quota_usage'
    operator VARCHAR(5) NOT NULL DEFAULT '>', -- '>' | '>=' | '<' | '<=' | '=='
    threshold NUMERIC NOT NULL,
    unit VARCHAR(20) DEFAULT '%',
    window_minutes INT DEFAULT 5,
    enabled BOOLEAN DEFAULT TRUE,
    trigger_count INT DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id UUID REFERENCES public.alert_rules(id) ON DELETE CASCADE,
    rule_name VARCHAR(150) NOT NULL,
    metric_value NUMERIC NOT NULL,
    threshold NUMERIC NOT NULL,
    unit VARCHAR(20) DEFAULT '%',
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_history_rule ON public.alert_history(rule_id);

-- Aturan bawaan (idempotent)
INSERT INTO public.alert_rules (name, description, metric, operator, threshold, unit, window_minutes, enabled)
SELECT * FROM (VALUES
  ('High Failure Rate', 'Alert ketika failure rate melebihi threshold dalam jendela waktu terakhir', 'failure_rate', '>', 5, '%', 5, TRUE),
  ('Queue Overload', 'Alert ketika antrean tertunda melebihi batas pesan', 'queue_pending', '>', 5000, 'pesan', 5, TRUE),
  ('High Latency', 'Alert ketika rata-rata latency pengiriman melebihi threshold', 'avg_latency', '>', 500, 'ms', 10, FALSE)
) AS seed(name, description, metric, operator, threshold, unit, window_minutes, enabled)
WHERE NOT EXISTS (SELECT 1 FROM public.alert_rules);
