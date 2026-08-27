import express from 'express';
import { Worker } from 'bullmq';
import { generateWebhookSignature, NOTIFICATION_STATUS, createLogger } from '@notification-gateway/shared';
import { config } from './config/env.js';
import callbackLogRoutes from './routes/callbackLogRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import * as callbackLogRepository from './repositories/callbackLogRepository.js';

const logger = createLogger('callback-log-service');
const app = express();

// Timeout fetch webhook — server klien lambat tidak boleh meng-hang worker
const WEBHOOK_TIMEOUT_MS = 10000;
// Retry webhook: tetap 3x dengan exponential backoff (perilaku lama dipertahankan),
// tapi dieksekusi inline — antrean & worker khusus webhook dihapus agar tidak ada
// polling BullMQ tambahan yang boros request Upstash.
const WEBHOOK_MAX_ATTEMPTS = 3;
const WEBHOOK_BACKOFF_BASE_MS = 5000;

app.use(express.json());

// Endpoint health check
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'callback-log-service', timestamp: new Date().toISOString() })
);

app.use('/', callbackLogRoutes);
app.use(errorHandler);

// Helper tidur untuk backoff antar percobaan webhook
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Kirim webhook callback ke URL klien dengan retry + exponential backoff + pencatatan DB.
// Dieksekusi sebagai fire-and-forget dari worker status-queue agar pembaruan status
// utama tidak ikut tertunda saat endpoint klien lambat.
async function deliverWebhookWithRetry({ messageId, webhookUrl, webhookSecret, payload }) {
  const signature = generateWebhookSignature(payload, webhookSecret);
  const notificationLog = await callbackLogRepository.findLogIdByMessageId(messageId);

  let httpStatus = null;
  let deliveredAt = null;
  let lastError = null;

  for (let attempt = 1; attempt <= WEBHOOK_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Gateway-Signature': signature },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS)
      });
      httpStatus = response.status;
      deliveredAt = new Date().toISOString();

      if (!response.ok) throw new Error(`Webhook endpoint returned HTTP ${response.status}`);

      logger.info({ messageId, url: webhookUrl, httpStatus, attempt }, 'Webhook delivered');
      lastError = null;
      break; // sukses — hentikan retry
    } catch (deliveryError) {
      lastError = deliveryError;
      logger.warn({ messageId, url: webhookUrl, attempt, err: deliveryError.message }, 'Webhook attempt failed');
      if (attempt < WEBHOOK_MAX_ATTEMPTS) {
        await sleep(WEBHOOK_BACKOFF_BASE_MS * 2 ** (attempt - 1)); // 5 dtk, 10 dtk (exponential)
      }
    }
  }

  if (lastError) {
    logger.error({ messageId, url: webhookUrl, err: lastError.message }, 'Webhook delivery failed after retries');
  }

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

// Worker: memproses pembaruan status log, lalu kirim webhook callback (inline)
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
    // Fire-and-forget: jangan blokir worker status-queue jika endpoint klien lambat,
    // tapi tangkap error agar tidak jadi unhandled rejection.
    deliverWebhookWithRetry({
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
    }).catch((err) => logger.error({ messageId, err: err.message }, 'Unexpected webhook error'));
  }
}, {
  connection: config.redis,
  // drainDelay: jeda sebelum worker polling ulang antrean kosong (hemat request Upstash)
  drainDelay: 30000,
  // stalled check diregangkan: default 30 dtk → 5 mnt agar hemat request Upstash
  stalledInterval: 300000,
  maxStalledCount: 2
});

app.listen(config.port, () => {
  logger.info(`Callback & Log Service running on http://localhost:${config.port}`);
});
