import { Worker, Queue } from 'bullmq';
import { createLogger } from '@notification-gateway/shared';
import { sendWhatsApp } from './sender.js';
import * as dispatchRepository from '../repositories/dispatchRepository.js';

const logger = createLogger('dispatch-service');

// Worker: memproses pengiriman antrean whatsapp
export function startWhatsAppWorker(redisConfig) {
  const statusQueue = new Queue('status-queue', { connection: redisConfig });

  const worker = new Worker('whatsapp-queue', async (job) => {
    const { messageId, projectId, recipient, templateCode, body, isSandbox } = job.data;
    logger.info({ messageId, recipient }, 'WhatsApp job processing');

    const vendorRecord = await dispatchRepository.findActiveVendorByChannel('WHATSAPP');

    try {
      const sendResult = await sendWhatsApp({ recipient, body, templateCode, credentials: vendorRecord?.credentials, isSandbox });
      await statusQueue.add('status-update', { messageId, projectId, status: 'SENT', vendorId: vendorRecord?.id });
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
