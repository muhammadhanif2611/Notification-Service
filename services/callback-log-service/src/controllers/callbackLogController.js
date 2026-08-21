import * as callbackLogService from '../services/callbackLogService.js';
import * as callbackLogRepository from '../repositories/callbackLogRepository.js';
import { createLogger } from '@notification-gateway/shared';

const logger = createLogger('callback-log-service');

// Controller: menerima status pengiriman dari provider (WhatsApp/Email)
export async function receiveProviderWebhook(req, res) {
  try {
    const provider = req.params.provider || 'unknown';
    const { messageId, status, error } = req.body || {};

    if (!messageId || !status) {
      return res.status(400).json({ success: false, error: 'messageId and status are required' });
    }

    await callbackLogRepository.updateStatusByProvider(messageId, status, {
      error_message: error || null
    });

    logger.info({ provider, messageId, status }, 'Provider webhook processed');
    return res.json({ success: true, provider, messageId, status });
  } catch (err) {
    logger.error({ err: err.message }, 'Provider webhook failed');
    return res.status(500).json({ success: false, error: err.message });
  }
}

// Controller: mengambil log notifikasi terbaru (scoped per project/user)
// Query params: projectId (dari client), limit, page
export async function getLogs(req, res) {
  try {
    const { projectId, limit = 100, page = 1 } = req.query;
    const data = await callbackLogService.getRecentLogs({ projectId, limit: parseInt(limit), page: parseInt(page) });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// Controller: mengambil statistik ringkasan notifikasi (scoped per project)
export async function getStatistics(req, res) {
  try {
    const { projectId } = req.query;
    const stats = await callbackLogService.getLogStatistics(projectId);
    return res.json({ success: true, stats });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
