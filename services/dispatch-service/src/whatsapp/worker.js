import { Worker, Queue } from 'bullmq';
import { createLogger } from '@notification-gateway/shared';
import { sendWhatsApp } from './sender.js';
import * as dispatchRepository from '../repositories/dispatchRepository.js';

const logger = createLogger('dispatch-service');

// Worker: proses antrean whatsapp
export function startWhatsAppWorker(redisConfig) {
  const statusQueue = new Queue('status-queue', { connection: redisConfig });

  const worker = new Worker('whatsapp-queue', async (job) => {
    const { messageId, projectId, recipient, templateCode, body, isSandbox } = job.data;
    logger.info({ messageId, recipient }, 'WhatsApp job processing');

    const vendor = await dispatchRepository.findActiveVendorByChannel('WHATSAPP');

    try {
      const res = await sendWhatsApp({ recipient, body, templateCode, credentials: vendor?.credentials, isSandbox });
      await statusQueue.add('status-update', { messageId, projectId, status: 'SENT', vendorId: vendor?.id });
      return res;
    } catch (err) {
      logger.error({ messageId, err: err.message }, 'WhatsApp job failed');
      await statusQueue.add('status-update', { messageId, projectId, status: 'FAILED', error: err.message });
      throw err;
    }
  }, { connection: redisConfig, concurrency: 5 });

  worker.on('completed', (j) => logger.info({ messageId: j.data.messageId }, 'WhatsApp sent'));
  worker.on('failed', (j, err) => logger.error({ messageId: j.data.messageId, err: err.message }, 'WhatsApp failed permanently'));
}
