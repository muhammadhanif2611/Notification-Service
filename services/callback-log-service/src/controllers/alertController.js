import { AppError } from '../middlewares/errorHandler.js';
import * as callbackLogRepository from '../repositories/callbackLogRepository.js';
import { evaluateRules } from '../services/alertEngine.js';

const VALID_METRICS = ['failure_rate', 'queue_pending', 'avg_latency', 'vendor_quota_usage'];
const VALID_OPERATORS = ['>', '>=', '<', '<=', '=='];

// Controller: Threshold Alert — aturan alert & riwayat trigger (admin only via gateway)

export async function listAlertRules(req, res, next) {
  try {
    const rules = await callbackLogRepository.findAlertRules();
    // Evaluasi live: deteksi rule yang sedang ter-trigger berdasarkan data terbaru
    const { results } = await evaluateRules(rules, { recordHistory: false });
    const triggeredMap = new Map(results.map((r) => [r.ruleId, r.value]));
    const data = rules.map((rule) => ({ ...rule, triggered: triggeredMap.has(rule.id), current_value: triggeredMap.get(rule.id) ?? null }));
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createAlertRule(req, res, next) {
  try {
    const { name, description, metric, operator = '>', threshold, unit = '%', window_minutes = 5, enabled = true } = req.body || {};
    if (!name || !metric || threshold === undefined) throw new AppError('name, metric, and threshold are required', 400, 'VALIDATION_ERROR');
    if (!VALID_METRICS.includes(metric)) throw new AppError('Invalid metric', 400, 'VALIDATION_ERROR');
    if (!VALID_OPERATORS.includes(operator)) throw new AppError('Invalid operator', 400, 'VALIDATION_ERROR');

    const data = await callbackLogRepository.insertAlertRule({ name, description, metric, operator, threshold, unit, window_minutes, enabled });
    return res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function updateAlertRule(req, res, next) {
  try {
    const { name, description, metric, operator, threshold, unit, window_minutes, enabled } = req.body || {};
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (metric !== undefined) {
      if (!VALID_METRICS.includes(metric)) throw new AppError('Invalid metric', 400, 'VALIDATION_ERROR');
      updateData.metric = metric;
    }
    if (operator !== undefined) {
      if (!VALID_OPERATORS.includes(operator)) throw new AppError('Invalid operator', 400, 'VALIDATION_ERROR');
      updateData.operator = operator;
    }
    if (threshold !== undefined) updateData.threshold = threshold;
    if (unit !== undefined) updateData.unit = unit;
    if (window_minutes !== undefined) updateData.window_minutes = window_minutes;
    if (enabled !== undefined) updateData.enabled = enabled;

    const data = await callbackLogRepository.updateAlertRule(req.params.id, updateData);
    if (!data) throw new AppError('Alert rule not found', 404, 'NOT_FOUND');
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function deleteAlertRule(req, res, next) {
  try {
    await callbackLogRepository.deleteAlertRule(req.params.id);
    return res.json({ success: true, data: { deleted: true } });
  } catch (err) { next(err); }
}

export async function listAlertHistory(_req, res, next) {
  try {
    const data = await callbackLogRepository.findAlertHistory();
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function resolveAlertHistoryEntry(req, res, next) {
  try {
    const data = await callbackLogRepository.resolveAlertHistory(req.params.id);
    if (!data) throw new AppError('Alert history entry not found', 404, 'NOT_FOUND');
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}
