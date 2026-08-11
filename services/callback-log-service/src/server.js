import express from 'express';
import { Worker } from 'bullmq';
import { generateWebhookSignature, NOTIFICATION_STATUS, createLogger } from '@notification-gateway/shared';
import { config } from './config/env.js';
import callbackLogRoutes from './routes/callbackLogRoutes.js';
import * as callbackLogRepository from './repositories/callbackLogRepository.js';

const logger = createLogger('callback-log-service');
const app = express();

app.use(express.json());
app.use('/', callbackLogRoutes);

// Worker: memproses pembaruan status log & pengiriman webhook callback
new Worker('status-queue', async (job) => {
  const { messageId, projectId, status, error, vendorId } = job.data;
  logger.info({ messageId, status }, 'Updating notification status');

  await callbackLogRepository.updateLogStatus(messageId, {
    status: status === 'SENT' ? NOTIFICATION_STATUS.SENT : NOTIFICATION_STATUS.FAILED,
    error_message: error || null,
    vendor_id: vendorId || null,
    sent_at: status === 'SENT' ? new Date().toISOString() : null
  });

  const projectRecord = await callbackLogRepository.findProjectWebhook(projectId);

  if (projectRecord?.webhook_url) {
    const webhookPayload = {
      event: 'notification.status_update',
      messageId,
      status,
      error: error || null,
      timestamp: new Date().toISOString()
    };
    const webhookSignature = generateWebhookSignature(webhookPayload, projectRecord.webhook_secret || 'default_secret');

    try {
      await fetch(projectRecord.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Gateway-Signature': webhookSignature },
        body: JSON.stringify(webhookPayload)
      });
      logger.info({ messageId, url: projectRecord.webhook_url }, 'Webhook delivered');
    } catch (deliveryError) {
      logger.error({ messageId, url: projectRecord.webhook_url, err: deliveryError.message }, 'Webhook delivery failed');
    }
  }
}, { connection: config.redis });

app.listen(config.port, () => {
  logger.info(`Callback & Log Service running on http://localhost:${config.port}`);
});
