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
    const notificationLog = await callbackLogRepository.findLogIdByMessageId(messageId);

    let httpStatus = null;
    let deliveredAt = null;
    try {
      const webhookResponse = await fetch(projectRecord.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Gateway-Signature': webhookSignature },
        body: JSON.stringify(webhookPayload)
      });
      httpStatus = webhookResponse.status;
      deliveredAt = new Date().toISOString();
      logger.info({ messageId, url: projectRecord.webhook_url, httpStatus }, 'Webhook delivered');
    } catch (deliveryError) {
      logger.error({ messageId, url: projectRecord.webhook_url, err: deliveryError.message }, 'Webhook delivery failed');
    }

    // Simpan histori pengiriman webhook ke tabel webhooks_log
    try {
      await callbackLogRepository.insertWebhookLog({
        notificationId: notificationLog?.id || null,
        messageId,
        webhookUrl: projectRecord.webhook_url,
        payloadSent: webhookPayload,
        signature: webhookSignature,
        httpStatus,
        deliveredAt
      });
    } catch (logError) {
      logger.error({ messageId, err: logError.message }, 'Failed to persist webhook log');
    }
  }
}, { connection: config.redis });

app.listen(config.port, () => {
  logger.info(`Callback & Log Service running on http://localhost:${config.port}`);
});
