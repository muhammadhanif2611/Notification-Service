-- Migrasi: tabel mta_domains & ip_pools untuk halaman Domain & MTA admin

CREATE TABLE IF NOT EXISTS public.mta_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain VARCHAR(255) UNIQUE NOT NULL,
    is_primary BOOLEAN DEFAULT FALSE,
    reputation INT DEFAULT 0, -- skor 0-100
    dns_records JSONB DEFAULT '[]'::jsonb, -- [{ type, expected, last_status }]
    last_checked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ip_pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address VARCHAR(45) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'Shared', -- 'Dedicated' | 'Shared'
    status VARCHAR(20) NOT NULL DEFAULT 'warming', -- 'warm' | 'warming' | 'cold'
    reputation INT DEFAULT 0, -- skor 0-100
    daily_volume INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Domain & IP bawaan (idempotent)
INSERT INTO public.mta_domains (domain, is_primary, dns_records)
SELECT 'mail.gateway.com', TRUE, '[
  {"type": "SPF", "expected": "v=spf1"},
  {"type": "MX", "expected": null},
  {"type": "DMARC", "expected": "v=DMARC1"},
  {"type": "DKIM", "expected": null, "selector": "default._domainkey"}
]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.mta_domains);
