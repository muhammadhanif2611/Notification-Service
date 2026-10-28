import * as callbackLogService from '../services/callbackLogService.js';
import * as callbackLogRepository from '../repositories/callbackLogRepository.js';
import { AppError } from '../middlewares/errorHandler.js';
import { createLogger } from '@notification-gateway/shared';

const logger = createLogger('callback-log-service:controller');

/**
 * Controller: menerima status pengiriman dari provider (WhatsApp / Email).
 * POST /callbacks/:provider
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function receiveProviderWebhook(req, res, next) {
  try {
    const provider = req.params.provider || 'unknown';
    const { messageId, status, error } = req.body || {};

    if (!messageId || !status) {
      throw new AppError('messageId and status are required.', 400, 'VALIDATION_ERROR');
    }

    await callbackLogRepository.updateStatusByProvider(messageId, status, {
      error_message: error || null
    });

    logger.info({ provider, messageId, status }, 'Provider webhook processed');
    return res.json({ success: true, provider, messageId, status });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: mengambil log notifikasi terbaru (scoped per project).
 * GET /logs
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getLogs(req, res, next) {
  try {
    const { projectId, limit = 100, page = 1 } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);

    const data = await callbackLogService.getRecentLogs({
      projectId: projectId || null,
      limit: parsedLimit,
      page: parsedPage
    });

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * Controller: mengambil statistik ringkasan notifikasi (scoped per project).
 * GET /statistics
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export async function getStatistics(req, res, next) {
  try {
    const { projectId, range = '7d' } = req.query;
    const stats = await callbackLogService.getLogStatistics(projectId || null, range);
    return res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
}
