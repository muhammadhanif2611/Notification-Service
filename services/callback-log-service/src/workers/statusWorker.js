import { Worker } from 'bullmq';
import { NOTIFICATION_STATUS, createLogger } from '@notification-gateway/shared';
import * as callbackLogRepository from '../repositories/callbackLogRepository.js';
import { queueDebouncedWebhook } from '../services/webhookService.js';

const logger = createLogger('callback-log-service:status-worker');

let workerInstance = null;

/**
 * Memulai worker antrean 'status-queue'.
 * Memproses pembaruan status pengiriman pesan dari dispatch-service
 * dan memicu webhook eksternal secara debounced.
 *
 * @param {object} redisConfig - Konfigurasi koneksi Redis
 * @returns {Worker} Instance worker
 */
export function startStatusWorker(redisConfig) {
  if (workerInstance) return workerInstance;

  workerInstance = new Worker('status-queue', async (job) => {
    const { messageId, projectId, status, error, vendorId } = job.data;
    logger.info({ messageId, status }, 'Processing status update job');

    // 1. Update status di database notification_logs
    await callbackLogRepository.updateLogStatus(messageId, {
      status: status === 'SENT' ? NOTIFICATION_STATUS.SENT : NOTIFICATION_STATUS.FAILED,
      error_message: error || null,
      vendor_id: vendorId || null,
      sent_at: status === 'SENT' ? new Date().toISOString() : null
    });

    // 2. Auto-suppression: kontak yang hard bounce diblokir dari pengiriman berikutnya
    if (status === 'FAILED' && job.data.recipient && job.data.channel) {
      try {
        await callbackLogRepository.insertSuppression({
          contact: job.data.recipient,
          channel: job.data.channel,
          reason: 'HARD_BOUNCE',
          notes: error || null
        });
      } catch (err) {
        logger.error({ messageId, err: err.message }, 'Failed to insert suppression entry');
      }
    }

    // 3. Cek apakah project mengonfigurasi webhook callback
    if (!projectId) return;

    try {
      const projectRecord = await callbackLogRepository.findProjectWebhook(projectId);
      if (projectRecord?.webhook_url) {
        // Hormati filter event yang dipilih klien di konfigurasi webhook project
        const eventType = status === 'SENT' ? 'message.delivered' : 'message.failed';
        const subscribed = projectRecord.webhook_events;
        if (Array.isArray(subscribed) && subscribed.length > 0 && !subscribed.includes(eventType)) return;

        // Alirkan ke webhook debouncer: tidak menembak HTTP terus menerus
        queueDebouncedWebhook({
          projectId,
          messageId,
          status,
          error,
          webhookUrl: projectRecord.webhook_url,
          webhookSecret: projectRecord.webhook_secret
        });
      }
    } catch (err) {
      logger.error({ projectId, messageId, err: err.message }, 'Failed to queue debounced webhook');
    }
  }, {
    connection: redisConfig,
    concurrency: 5,
    drainDelay: 30000,
    stalledInterval: 300000,
    maxStalledCount: 2
  });

  workerInstance.on('completed', (job) => {
    logger.debug({ jobId: job.id, messageId: job.data?.messageId }, 'Status update job completed');
  });

  workerInstance.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, messageId: job?.data?.messageId, err: err.message }, 'Status update job failed');
  });

  workerInstance.on('error', (err) => {
    logger.error({ err: err.message }, 'Status worker internal error');
  });

  return workerInstance;
}

/**
 * Menghentikan status worker secara graceful.
 * @returns {Promise<void>}
 */
export async function stopStatusWorker() {
  if (workerInstance) {
    await workerInstance.close();
    workerInstance = null;
  }
}
