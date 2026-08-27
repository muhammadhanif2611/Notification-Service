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
  }, { connection: redisConfig, concurrency: 5 });

  worker.on('completed', (job) => logger.info({ messageId: job.data.messageId }, 'WhatsApp sent'));
  worker.on('failed', (job, error) => logger.error({ messageId: job.data.messageId, err: error.message }, 'WhatsApp failed permanently'));
}
