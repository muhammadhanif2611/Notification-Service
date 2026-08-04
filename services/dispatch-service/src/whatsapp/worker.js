import { Worker, Queue } from 'bullmq';
import { supabase } from '@notification-gateway/database';
import { sendWhatsApp } from './sender.js';

export function startWhatsAppWorker(redisConfig) {
  const statusQueue = new Queue('status-queue', { connection: redisConfig });

  const worker = new Worker('whatsapp-queue', async (job) => {
    const { messageId, projectId, recipient, templateCode, body, isSandbox } = job.data;
    console.log(`[WA Worker] Processing ${messageId} to ${recipient}`);

    const { data: vendor } = await supabase.from('vendors').select('*').eq('channel', 'WHATSAPP').eq('is_active', true).maybeSingle();

    try {
      const res = await sendWhatsApp({ recipient, body, templateCode, credentials: vendor?.credentials, isSandbox });
      await statusQueue.add('status-update', { messageId, projectId, status: 'SENT', vendorId: vendor?.id });
      return res;
    } catch (err) {
      console.error(`[WA Worker Error] ${messageId}:`, err.message);
      await statusQueue.add('status-update', { messageId, projectId, status: 'FAILED', error: err.message });
      throw err;
    }
  }, { connection: redisConfig, concurrency: 5 });

  worker.on('completed', (j) => console.log(`✅ [WA Sent] ${j.data.messageId}`));
  worker.on('failed', (j, err) => console.error(`❌ [WA Failed] ${j.data.messageId}: ${err.message}`));
}
