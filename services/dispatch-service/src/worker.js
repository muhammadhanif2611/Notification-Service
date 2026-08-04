import { Worker, Queue } from 'bullmq';
import dotenv from 'dotenv';
import { supabase } from '@notification-gateway/database';
import { NOTIFICATION_STATUS, CHANNELS, QUEUE_NAMES } from '@notification-gateway/shared';
import { sendWhatsAppMessage } from './vendors/whatsapp.js';
import { sendEmailMessage } from './vendors/email.js';

dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined
};

const webhookQueue = new Queue(QUEUE_NAMES.WEBHOOK_DELIVERY, {
  connection: redisConfig
});

console.log('🚀 Dispatch Microservice Worker starting...');

const worker = new Worker(
  QUEUE_NAMES.NOTIFICATION_DISPATCH,
  async (job) => {
    const { messageId, projectId, channel, recipient, templateCode, variables, body, subject, environment } = job.data;
    console.log(`[Worker] Processing message ${messageId} (${channel}) to ${recipient}`);

    // Update status to PROCESSING
    await supabase
      .from('notification_logs')
      .update({ status: NOTIFICATION_STATUS.PROCESSING })
      .eq('message_id', messageId);

    // Fetch active vendor credentials from database
    const { data: vendor } = await supabase
      .from('vendors')
      .select('*')
      .eq('channel', channel)
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .limit(1)
      .maybeSingle();

    let result;
    try {
      if (channel === CHANNELS.WHATSAPP) {
        result = await sendWhatsAppMessage({
          recipient,
          body,
          templateCode,
          variables,
          credentials: vendor?.credentials
        });
      } else if (channel === CHANNELS.EMAIL) {
        result = await sendEmailMessage({
          recipient,
          subject,
          body,
          credentials: vendor?.credentials
        });
      } else {
        throw new Error(`Unsupported channel: ${channel}`);
      }

      // Update status to SENT
      await supabase
        .from('notification_logs')
        .update({
          status: NOTIFICATION_STATUS.SENT,
          sent_at: new Date().toISOString(),
          vendor_id: vendor?.id || null
        })
        .eq('message_id', messageId);

      // Queue webhook callback to client app
      await webhookQueue.add('deliver-webhook', {
        messageId,
        projectId,
        status: NOTIFICATION_STATUS.SENT,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (err) {
      console.error(`[Worker Error] Message ${messageId} failed:`, err.message);

      await supabase
        .from('notification_logs')
        .update({
          status: NOTIFICATION_STATUS.FAILED,
          error_message: err.message
        })
        .eq('message_id', messageId);

      await webhookQueue.add('deliver-webhook', {
        messageId,
        projectId,
        status: NOTIFICATION_STATUS.FAILED,
        error: err.message,
        timestamp: new Date().toISOString()
      });

      throw err;
    }
  },
  {
    connection: redisConfig,
    concurrency: 5
  }
);

worker.on('completed', (job) => {
  console.log(`✅ [Job Completed] ${job.data.messageId}`);
});

worker.on('failed', (job, err) => {
  console.error(`❌ [Job Failed] ${job.data.messageId}: ${err.message}`);
});
