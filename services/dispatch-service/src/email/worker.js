import { Worker, Queue } from 'bullmq';
import { createLogger, decryptAES } from '@notification-gateway/shared';
import { sendEmail } from './sender.js';
import * as dispatchRepository from '../repositories/dispatchRepository.js';

const logger = createLogger('dispatch-service');

// Helper: dekripsi credentials vendor jika tersedia, null jika sandbox
function resolveVendorCredentials(vendorRecord) {
  if (!vendorRecord?.credential_encrypted) return null;
  return JSON.parse(decryptAES({
    encryptedData: vendorRecord.credential_encrypted,
    iv: vendorRecord.credential_iv,
    authTag: vendorRecord.credential_auth_tag
  }));
}

// Worker: memproses pengiriman antrean email
export function startEmailWorker(redisConfig) {
  const statusQueue = new Queue('status-queue', { connection: redisConfig });

  const worker = new Worker('email-queue', async (job) => {
    const { messageId, projectId, recipient, subject, body, isSandbox } = job.data;
    logger.info({ messageId, recipient }, 'Email job processing');

    const vendorRecord = await dispatchRepository.findActiveVendorByChannel('EMAIL');
    const credentials = resolveVendorCredentials(vendorRecord);

    try {
      const sendResult = await sendEmail({ recipient, subject, body, credentials, isSandbox });
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
