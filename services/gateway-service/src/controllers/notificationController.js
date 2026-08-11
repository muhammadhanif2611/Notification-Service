import * as gatewayNotificationService from '../services/gatewayNotificationService.js';
import { createLogger } from '@notification-gateway/shared';

const logger = createLogger('gateway-service');

// Controller: pengiriman notifikasi
export async function sendNotification(req, res) {
  try {
    const data = await gatewayNotificationService.ingestNotification({
      reqBody: req.body,
      project: req.project,
      environment: req.environment
    });
    return res.status(202).json({ success: true, ...data });
  } catch (err) {
    if (err.statusCode === 400) {
      return res.status(400).json({ success: false, error: { code: err.code, message: err.message, details: err.details } });
    }
    logger.error({ err: err.message }, 'Ingestion endpoint error');
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to ingest notification request.' } });
  }
}
