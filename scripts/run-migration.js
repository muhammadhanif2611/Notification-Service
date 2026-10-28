#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MIGRATIONS = [
  '20260804_initial_schema.sql',
  '20260805_phase2_vendor_encryption.sql',
  '20260813_phase5_webhooks_log.sql',
  '20260814_vendor_provider.sql',
  '20260821_add_owner_id_to_projects.sql',
  '20260822_notification_log_stats_rpc.sql',
  '20260827_drop_template_status.sql',
  '20261023_remove_template_approval.sql',
  '20261101_phase6_alert_rules.sql',
  '20261101_phase6_mta_domain.sql',
  '20261101_phase6_stats_trend.sql',
  '20261101_phase6_suppression_list.sql',
  '20261101_phase6_webhook_events.sql'
];

const REQUIRED_RELATIONS = [
  'profiles',
  'audit_logs',
  'projects',
  'api_keys',
  'templates',
  'vendors',
  'notification_logs',
  'webhooks_log',
  'suppression_list',
  'alert_rules',
  'alert_history',
  'mta_domains',
  'ip_pools',
  'admin_project_usage',
  'admin_client_overview',
  'admin_client_summary'
];

const REQUIRED_RPCS = [
  { name: 'get_notification_log_stats', args: { p_project_id: null } },
  { name: 'get_notification_daily_trend', args: { p_project_id: null, p_days: 7 } },
  { name: 'get_notification_channel_breakdown', args: { p_project_id: null } }
];

async function verifySchema() {
  console.log('\nVerifying remote Supabase schema status...');
  const missingRelations = [];

  for (const relation of REQUIRED_RELATIONS) {
    const { error } = await supabase.from(relation).select('*').limit(1);
    if (error) {
      missingRelations.push(`${relation} (${error.message})`);
      console.log(`   [MISSING] Table/View: ${relation} -> ${error.message}`);
    } else {
      console.log(`   [OK]      Table/View: ${relation}`);
    }
  }

  for (const rpc of REQUIRED_RPCS) {
    const { error } = await supabase.rpc(rpc.name, rpc.args);
    if (error) {
      missingRelations.push(`RPC ${rpc.name} (${error.message})`);
      console.log(`   [MISSING] RPC: ${rpc.name} -> ${error.message}`);
    } else {
      console.log(`   [OK]      RPC: ${rpc.name}`);
    }
  }

  return missingRelations;
}

async function seedDefaultData() {
  const { data: existingRules, error: rulesErr } = await supabase
    .from('alert_rules')
    .select('id')
    .limit(1);

  if (!rulesErr && existingRules && existingRules.length === 0) {
    await supabase.from('alert_rules').insert([
      {
        name: 'High Failure Rate',
        description: 'Alert ketika failure rate melebihi threshold dalam jendela waktu terakhir',
        metric: 'failure_rate',
        operator: '>',
        threshold: 5,
        unit: '%',
        window_minutes: 5,
        enabled: true
      },
      {
        name: 'Queue Overload',
        description: 'Alert ketika antrean tertunda melebihi batas pesan',
        metric: 'queue_pending',
        operator: '>',
        threshold: 5000,
        unit: 'pesan',
        window_minutes: 5,
        enabled: true
      },
      {
        name: 'High Latency',
        description: 'Alert ketika rata-rata latency pengiriman melebihi threshold',
        metric: 'avg_latency',
        operator: '>',
        threshold: 500,
        unit: 'ms',
        window_minutes: 10,
        enabled: false
      }
    ]);
    console.log('   [SEEDED] Default alert_rules');
  }

  const { data: existingDomains, error: domainsErr } = await supabase
    .from('mta_domains')
    .select('id')
    .limit(1);

  if (!domainsErr && existingDomains && existingDomains.length === 0) {
    await supabase.from('mta_domains').insert([
      {
        domain: 'mail.gateway.com',
        is_primary: true,
        dns_records: [
          { type: 'SPF', expected: 'v=spf1' },
          { type: 'MX', expected: null },
          { type: 'DMARC', expected: 'v=DMARC1' },
          { type: 'DKIM', expected: null, selector: 'default._domainkey' }
        ]
      }
    ]);
    console.log('   [SEEDED] Default mta_domains');
  }
}

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Supabase credentials in .env');
    process.exit(1);
  }

  const probeSql = readFileSync(
    join(__dirname, '..', 'packages', 'database', 'supabase', 'migrations', MIGRATIONS[0]),
    'utf8'
  );
  const { error: probeError } = await supabase.rpc('exec_sql', { sql_query: probeSql });

  if (!probeError) {
    console.log(`Applied: ${MIGRATIONS[0]}`);
    for (const migration of MIGRATIONS.slice(1)) {
      const sql = readFileSync(
        join(__dirname, '..', 'packages', 'database', 'supabase', 'migrations', migration),
        'utf8'
      );
      const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
      console.log(error ? `Failed ${migration}: ${error.message}` : `Applied: ${migration}`);
    }
  } else {
    console.log('Note: Direct DDL via PostgREST RPC (public.exec_sql) is not enabled on this Supabase instance.');
  }

  const missing = await verifySchema();
  await seedDefaultData();

  if (missing.length > 0) {
    console.log('\nTo synchronize missing tables/views/RPCs on Supabase, run scripts/RUN_THIS_MIGRATION.sql in the Supabase SQL Editor.');
  } else {
    console.log('\nAll Phase 1-6 tables, views, and RPC functions are synchronized on Supabase!');
  }
}

main().catch(console.error);
