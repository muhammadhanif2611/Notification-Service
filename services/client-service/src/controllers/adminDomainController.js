import { supabase } from '@notification-gateway/database';
import { promises as dns } from 'dns';
import { AppError } from '../middlewares/errorHandler.js';
import { createLogger } from '@notification-gateway/shared';

const logger = createLogger('client-service:admin-domain');

const DNS_TIMEOUT_MS = 5000;
const WEBHOOK_CHECK_TIMEOUT_MS = 8000;

async function resolveWithTimeout(resolver, ...args) {
  return await Promise.race([
    resolver(...args),
    new Promise((_, reject) => setTimeout(() => reject(new Error('DNS lookup timeout')), DNS_TIMEOUT_MS))
  ]);
}

// Verifikasi satu tipe record DNS untuk sebuah domain
async function checkDnsRecord(domain, record) {
  const type = record.type?.toUpperCase();
  try {
    if (type === 'SPF' || type === 'DMARC') {
      const name = type === 'DMARC' ? `_dmarc.${domain}` : domain;
      const txtRecords = await resolveWithTimeout(dns.resolveTxt, name);
      const values = txtRecords.map((chunks) => chunks.join(''));
      const matched = record.expected ? values.some((v) => v.includes(record.expected)) : values.length > 0;
      return { type, record: values[0] || null, status: matched ? 'verified' : 'failed' };
    }
    if (type === 'MX') {
      const mxRecords = await resolveWithTimeout(dns.resolveMx, domain);
      const values = mxRecords.map((mx) => `${mx.priority} ${mx.exchange}`);
      return { type, record: values[0] || null, status: values.length > 0 ? 'verified' : 'failed' };
    }
    if (type === 'DKIM') {
      const selector = record.selector ? `${record.selector}.${domain}` : `default._domainkey.${domain}`;
      const txtRecords = await resolveWithTimeout(dns.resolveTxt, selector);
      const values = txtRecords.map((chunks) => chunks.join(''));
      return { type, record: values[0] || null, status: values.length > 0 ? 'verified' : 'failed' };
    }
    if (type === 'PTR') {
      const ptrRecords = await resolveWithTimeout(dns.reverse, record.ip || '');
      return { type, record: ptrRecords[0] || null, status: ptrRecords.length > 0 ? 'verified' : 'failed' };
    }
    return { type, record: null, status: 'unknown' };
  } catch {
    return { type, record: null, status: 'failed' };
  }
}


export async function getDomainOverview(_req, res, next) {
  try {
    const { data, error } = await supabase.from('mta_domains').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function verifyDomain(req, res, next) {
  try {
    const { data: domain, error } = await supabase
      .from('mta_domains').select('*').eq('id', req.params.id).maybeSingle();
    if (error) throw error;
    if (!domain) throw new AppError('Domain not found', 404, 'NOT_FOUND');

    const checkedRecords = await Promise.all(
      (domain.dns_records || []).map((record) => checkDnsRecord(domain.domain, record))
    );
    const verifiedCount = checkedRecords.filter((r) => r.status === 'verified').length;
    const reputation = checkedRecords.length > 0 ? Math.round((verifiedCount / checkedRecords.length) * 100) : 0;

    const { data: updated, error: updateError } = await supabase
      .from('mta_domains')
      .update({ dns_records: checkedRecords, reputation, last_checked_at: new Date().toISOString() })
      .eq('id', domain.id).select().single();
    if (updateError) throw updateError;

    logger.info({ domain: domain.domain, reputation }, 'Domain DNS verified');
    return res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

export async function listIpPools(_req, res, next) {
  try {
    const { data, error } = await supabase.from('ip_pools').select('*').order('created_at', { ascending: true });
    if (error) throw error;
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createIpPool(req, res, next) {
  try {
    const { ip_address, type = 'Shared', status = 'warming' } = req.body || {};
    if (!ip_address) throw new AppError('ip_address is required', 400, 'VALIDATION_ERROR');

    const { data, error } = await supabase
      .from('ip_pools').insert({ ip_address, type, status }).select().single();
    if (error) {
      if (error.code === '23505') throw new AppError('IP address already registered', 409, 'DUPLICATE_IP');
      throw error;
    }
    return res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteIpPool(req, res, next) {
  try {
    const { error } = await supabase.from('ip_pools').delete().eq('id', req.params.id);
    if (error) throw error;
    return res.json({ success: true, data: { deleted: true } });
  } catch (err) { next(err); }
}

// Health check endpoint webhook project: kirim payload ping lalu catat status HTTP & latency
export async function checkWebhookHealth(req, res, next) {
  try {
    const { data: project, error } = await supabase
      .from('projects').select('id, webhook_url').eq('id', req.params.projectId).maybeSingle();
    if (error) throw error;
    if (!project) throw new AppError('Project not found', 404, 'NOT_FOUND');
    if (!project.webhook_url) throw new AppError('Project has no webhook URL configured', 400, 'NO_WEBHOOK');

    const startedAt = Date.now();
    let httpStatus = null;
    let reachable = false;
    try {
      const response = await fetch(project.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'webhook.ping', created_at: new Date().toISOString(), data: { _health_check: true } }),
        signal: AbortSignal.timeout(WEBHOOK_CHECK_TIMEOUT_MS)
      });
      httpStatus = response.status;
      reachable = response.ok;
    } catch {
      reachable = false;
    }

    return res.json({
      success: true,
      data: {
        reachable,
        http_status: httpStatus,
        latency_ms: Date.now() - startedAt,
        checked_at: new Date().toISOString()
      }
    });
  } catch (err) { next(err); }
}
