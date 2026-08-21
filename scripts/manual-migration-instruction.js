#!/usr/bin/env node
/**
 * Script untuk menampilkan instruksi migration manual
 * Karena Supabase tidak support exec_sql via RPC, migration harus manual
 */

console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                    🚨 MANUAL MIGRATION REQUIRED 🚨                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  Supabase tidak mendukung eksekusi SQL via API.                              ║
║  Anda perlu menjalankan migration secara manual di SQL Editor.               ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  LANGKAH-LANGKAH:                                                            ║
║                                                                              ║
║  1. Buka: https://supabase.com/dashboard                                     ║
║  2. Pilih project: kddzqzibkfwahwjcbfqb                                      ║
║  3. Klik: SQL Editor (ikon database di sidebar kiri)                         ║
║  4. Klik: New Query                                                          ║
║  5. Copy-paste SQL di bawah ini:                                             ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
  ALTER TABLE public.projects 
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

  CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON public.projects(owner_id);

  UPDATE public.projects 
  SET owner_id = (SELECT id FROM public.profiles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1)
  WHERE owner_id IS NULL;
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  6. Klik: Run (atau tekan Ctrl+Enter)                                        ║
║  7. Pastikan muncul: "Success. No rows returned"                             ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║  VERIFIKASI:                                                                 ║
║                                                                              ║
  Setelah migration, jalankan query ini untuk cek:                              ║
                                                                              ║
  SELECT p.id, p.name, p.owner_id, pr.email as owner_email                     ║
  FROM public.projects p                                                       ║
  LEFT JOIN public.profiles pr ON p.owner_id = pr.id;                          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

File SQL siap copy: scripts/RUN_THIS_MIGRATION.sql
`);

// Cek apakah kolom sudah ada
import('@supabase/supabase-js').then(async (m) => {
  const s = m.createClient(
    'https://kddzqzibkfwahwjcbfqb.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtkZHpxemlia2Z3YWh3amNiZnFiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTQ5MjU5NiwiZXhwIjoyMTAxMDY4NTk2fQ.uNGYT35ib5ce9yrZpWt465FQxi4ssHhc5-Rtw5F0ua4'
  );
  
  const { error } = await s.from('projects').select('owner_id').limit(1);
  
  if (error && error.message.includes('owner_id')) {
    console.log('❌ STATUS: Kolom owner_id BELUM ada. Silakan jalankan migration di atas.\n');
    process.exit(1);
  } else {
    console.log('✅ STATUS: Kolom owner_id SUDAH ada! Migration tidak perlu dijalankan.\n');
  }
});