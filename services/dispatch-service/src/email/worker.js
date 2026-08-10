import { Worker, Queue } from 'bullmq';
import { supabase } from '@notification-gateway/database';
import { createLogger } from '@notification-gateway/shared';
import { sendEmail } from './sender.js';

const logger = createLogger('dispatch-service');

export function startEmailWorker(redisConfig) {
  const statusQueue = new Queue('status-queue', { connection: redisConfig });

  const worker = new Worker('email-queue', async (job) => {
    const { messageId, projectId, recipient, subject, body, isSandbox } = job.data;
    logger.info({ messageId, recipient }, 'Email job processing');

    const { data: vendor } = await supabase.from('vendors').select('*').eq('channel', 'EMAIL').eq('is_active', true).maybeSingle();

    try {
      const res = await sendEmail({ recipient, subject, body, credentials: vendor?.credentials, isSandbox });
      await statusQueue.add('status-update', { messageId, projectId, status: 'SENT', vendorId: vendor?.id });
      return res;
    } catch (err) {
      logger.error({ messageId, err: err.message }, 'Email job failed');
      await statusQueue.add('status-update', { messageId, projectId, status: 'FAILED', error: err.message });
      throw err;
    }
  }, { connection: redisConfig, concurrency: 5 });

  worker.on('completed', (j) => logger.info({ messageId: j.data.messageId }, 'Email sent'));
  worker.on('failed', (j, err) => logger.error({ messageId: j.data.messageId, err: err.message }, 'Email failed permanently'));
}
