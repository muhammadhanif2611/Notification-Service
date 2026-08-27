import { Worker, Queue } from 'bullmq';
import { createLogger } from '@notification-gateway/shared';
import { sendWhatsApp } from './sender.js';

const logger = createLogger('dispatch-service');

// Worker: memproses pengiriman antrean whatsapp via Baileys (tidak butuh vendor credentials)
export function startWhatsAppWorker(redisConfig) {
  const statusQueue = new Queue('status-queue', { connection: redisConfig });

  const worker = new Worker('whatsapp-queue', async (job) => {
    const { messageId, projectId, recipient, body, isSandbox } = job.data;
    logger.info({ messageId, recipient }, 'WhatsApp job processing');

    try {
      const sendResult = await sendWhatsApp({ projectId, recipient, body, isSandbox });
      await statusQueue.add('status-update', { messageId, projectId, status: 'SENT' });
      return sendResult;
    } catch (error) {
      logger.error({ messageId, err: error.message }, 'WhatsApp job failed');
      await statusQueue.add('status-update', { messageId, projectId, status: 'FAILED', error: error.message });
      throw error;
    }
  }, {
    connection: redisConfig,
    concurrency: 5,
    // drainDelay: jeda (ms) sebelum worker polling ulang antrean saat kosong.
    // Default 5 dtk → 30 dtk agar request ke Upstash jauh lebih hemat.
    drainDelay: 30000,
    // stalledInterval: seberapa sering BullMQ memeriksa job yang macet.
    // Default 30 dtk → 5 mnt agar hemat request Upstash (cek ini memakai Lua tiap interval).
    stalledInterval: 300000,
    maxStalledCount: 2
  });

  worker.on('completed', (job) => logger.info({ messageId: job.data.messageId }, 'WhatsApp sent'));
  worker.on('failed', (job, error) => logger.error({ messageId: job.data.messageId, err: error.message }, 'WhatsApp failed permanently'));
}
