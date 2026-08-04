import { Worker, Queue } from 'bullmq';
import { supabase } from '@notification-gateway/database';
import { sendEmail } from './sender.js';

export function startEmailWorker(redisConfig) {
  const statusQueue = new Queue('status-queue', { connection: redisConfig });

  const worker = new Worker('email-queue', async (job) => {
    const { messageId, projectId, recipient, subject, body, isSandbox } = job.data;
    console.log(`[Email Worker] Processing ${messageId} to ${recipient}`);

    const { data: vendor } = await supabase.from('vendors').select('*').eq('channel', 'EMAIL').eq('is_active', true).maybeSingle();

    try {
      const res = await sendEmail({ recipient, subject, body, credentials: vendor?.credentials, isSandbox });
      await statusQueue.add('status-update', { messageId, projectId, status: 'SENT', vendorId: vendor?.id });
      return res;
    } catch (err) {
      console.error(`[Email Worker Error] ${messageId}:`, err.message);
      await statusQueue.add('status-update', { messageId, projectId, status: 'FAILED', error: err.message });
      throw err;
    }
  }, { connection: redisConfig, concurrency: 5 });

  worker.on('completed', (j) => console.log(`✅ [Email Sent] ${j.data.messageId}`));
  worker.on('failed', (j, err) => console.error(`❌ [Email Failed] ${j.data.messageId}: ${err.message}`));
}
