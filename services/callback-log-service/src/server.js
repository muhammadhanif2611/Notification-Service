import express from 'express';
import { Worker, Queue } from 'bullmq';
import { generateWebhookSignature, NOTIFICATION_STATUS, createLogger } from '@notification-gateway/shared';
import { config } from './config/env.js';
import callbackLogRoutes from './routes/callbackLogRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import * as callbackLogRepository from './repositories/callbackLogRepository.js';

const logger = createLogger('callback-log-service');
const app = express();

// Timeout fetch webhook — server klien lambat tidak boleh meng-hang worker
const WEBHOOK_TIMEOUT_MS = 10000;

app.use(express.json());

// Endpoint health check
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'callback-log-service', timestamp: new Date().toISOString() })
);

app.use('/', callbackLogRoutes);
app.use(errorHandler);

// Queue pengiriman webhook — retry 3x + exponential backoff agar webhook gagal tidak hilang
const webhookDeliveryQueue = new Queue('webhook-delivery-queue', {
  connection: config.redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 500 },
    removeOnFail: { count: 1000 }
  }
});

// Worker: memproses pembaruan status log, lalu push webhook ke antrean delivery
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
    await webhookDeliveryQueue.add('deliver-webhook', {
      messageId,
      webhookUrl: projectRecord.webhook_url,
      webhookSecret: projectRecord.webhook_secret || 'default_secret',
      payload: {
        event: 'notification.status_update',
        messageId,
        status,
        error: error || null,
        timestamp: new Date().toISOString()
      }
    });
  }
}, { connection: config.redis });

// Worker: mengirim webhook callback ke URL klien dengan timeout & retry via BullMQ
new Worker('webhook-delivery-queue', async (job) => {
  const { messageId, webhookUrl, webhookSecret, payload } = job.data;
  const signature = generateWebhookSignature(payload, webhookSecret);
  const notificationLog = await callbackLogRepository.findLogIdByMessageId(messageId);

  let httpStatus = null;
  let deliveredAt = null;
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Gateway-Signature': signature },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS)
    });
    httpStatus = response.status;
    deliveredAt = new Date().toISOString();
    logger.info({ messageId, url: webhookUrl, httpStatus }, 'Webhook delivered');
  } catch (deliveryError) {
    logger.error({ messageId, url: webhookUrl, err: deliveryError.message }, 'Webhook delivery failed');
    throw deliveryError; // lempar agar BullMQ retry sesuai attempts/backoff
  } finally {
    // Histori pengiriman webhook dicatat baik sukses maupun gagal
    try {
      await callbackLogRepository.insertWebhookLog({
        notificationId: notificationLog?.id || null,
        messageId,
        webhookUrl,
        payloadSent: payload,
        signature,
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
