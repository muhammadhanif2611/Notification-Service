import { supabase } from '@notification-gateway/database';
import { createLogger } from '@notification-gateway/shared';
import * as callbackLogRepository from '../repositories/callbackLogRepository.js';

const logger = createLogger('callback-log-service:alert-engine');

const OPERATORS = {
  '>': (a, b) => a > b,
  '>=': (a, b) => a >= b,
  '<': (a, b) => a < b,
  '<=': (a, b) => a <= b,
  '==': (a, b) => a === b
};

// Hitung nilai metrik terkini berdasarkan window waktu rule
async function computeMetricValue(rule) {
  const since = new Date(Date.now() - (rule.window_minutes || 5) * 60 * 1000).toISOString();

  if (rule.metric === 'failure_rate') {
    const { data, error } = await supabase
      .from('notification_logs').select('status').gte('created_at', since);
    if (error) throw error;
    const total = data.length;
    if (total === 0) return 0;
    const failed = data.filter((l) => l.status === 'FAILED').length;
    return Number(((failed / total) * 100).toFixed(2));
  }

  if (rule.metric === 'queue_pending') {
    const { count, error } = await supabase
      .from('notification_logs')
      .select('id', { count: 'exact', head: true })
      .in('status', ['PENDING', 'QUEUED', 'PROCESSING']);
    if (error) throw error;
    return count || 0;
  }

  if (rule.metric === 'avg_latency') {
    const { data, error } = await supabase
      .from('notification_logs').select('created_at, sent_at').not('sent_at', 'is', null)
      .gte('created_at', since).order('created_at', { ascending: false }).limit(200);
    if (error) throw error;
    if (!data.length) return 0;
    const totalMs = data.reduce((sum, l) => sum + (new Date(l.sent_at) - new Date(l.created_at)), 0);
    return Math.round(totalMs / data.length);
  }

  return null; // metric tidak dikenal — lewati
}

/**
 * Evaluasi seluruh rule aktif terhadap metrik terkini.
 * Jika recordHistory=true, rule yang ter-trigger dicatat ke alert_history
 * dan trigger_count rule diperbarui.
 */
export async function evaluateRules(rules = null, { recordHistory = true } = {}) {
  const activeRules = (rules || await callbackLogRepository.findAlertRules()).filter((r) => r.enabled);
  const results = [];

  for (const rule of activeRules) {
    try {
      const value = await computeMetricValue(rule);
      if (value === null) continue;

      const compare = OPERATORS[rule.operator] || OPERATORS['>'];
      if (compare(value, Number(rule.threshold))) {
        results.push({ ruleId: rule.id, ruleName: rule.name, value });

        if (recordHistory) {
          await callbackLogRepository.insertAlertHistory({
            rule_id: rule.id,
            rule_name: rule.name,
            metric_value: value,
            threshold: rule.threshold,
            unit: rule.unit
          });
          await callbackLogRepository.incrementRuleTrigger(rule.id);
          logger.warn({ rule: rule.name, value, threshold: rule.threshold }, 'Alert rule triggered');
        }
      }
    } catch (err) {
      logger.error({ ruleId: rule.id, err: err.message }, 'Failed to evaluate alert rule');
    }
  }

  return { triggered: results.length, results };
}

// Jalankan evaluasi rule secara periodik
export function startAlertEngine(intervalMs = 60000) {
  const timer = setInterval(() => {
    evaluateRules().catch((err) => logger.error({ err: err.message }, 'Alert engine evaluation failed'));
  }, intervalMs);
  timer.unref();
  logger.info({ intervalMs }, 'Alert engine started');
  return timer;
}
