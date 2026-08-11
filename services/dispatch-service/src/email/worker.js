import { Worker, Queue } from 'bullmq';
import { createLogger } from '@notification-gateway/shared';
import { sendEmail } from './sender.js';
import * as dispatchRepository from '../repositories/dispatchRepository.js';

const logger = createLogger('dispatch-service');

// Worker: memproses pengiriman antrean email
export function startEmailWorker(redisConfig) {
  const statusQueue = new Queue('status-queue', { connection: redisConfig });

  const worker = new Worker('email-queue', async (job) => {
    const { messageId, projectId, recipient, subject, body, isSandbox } = job.data;
    logger.info({ messageId, recipient }, 'Email job processing');

    const vendorRecord = await dispatchRepository.findActiveVendorByChannel('EMAIL');

    try {
      const sendResult = await sendEmail({ recipient, subject, body, credentials: vendorRecord?.credentials, isSandbox });
      await statusQueue.add('status-update', { messageId, projectId, status: 'SENT', vendorId: vendorRecord?.id });
      return sendResult;
    } catch (error) {
      logger.error({ messageId, err: error.message }, 'Email job failed');
      await statusQueue.add('status-update', { messageId, projectId, status: 'FAILED', error: error.message });
      throw error;
    }
  }, { connection: redisConfig, concurrency: 5 });

  worker.on('completed', (job) => logger.info({ messageId: job.data.messageId }, 'Email sent'));
  worker.on('failed', (job, error) => logger.error({ messageId: job.data.messageId, err: error.message }, 'Email failed permanently'));
}
