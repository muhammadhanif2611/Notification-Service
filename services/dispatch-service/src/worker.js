import { Worker, Queue } from 'bullmq';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { supabase } from '@notification-gateway/database';
import { NOTIFICATION_STATUS, CHANNELS, QUEUE_NAMES, createLogger } from '@notification-gateway/shared';
import { sendWhatsAppMessage } from './vendors/whatsapp.js';
import { sendEmailMessage } from './vendors/email.js';

const findEnv = () => {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (dir !== path.parse(dir).root) {
    const envPath = path.join(dir, '.env');
    if (fs.existsSync(envPath)) return envPath;
    dir = path.dirname(dir);
  }
  return null;
};

dotenv.config({ path: findEnv() });

const logger = createLogger('dispatch-service');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined
};

const webhookQueue = new Queue(QUEUE_NAMES.WEBHOOK_DELIVERY, { connection: redisConfig });

const worker = new Worker(
  QUEUE_NAMES.NOTIFICATION_DISPATCH,
  async (job) => {
    const { messageId, projectId, channel, recipient, templateCode, variables, body, subject } = job.data;
    logger.info({ messageId, channel, recipient }, 'Processing job');

    await supabase
      .from('notification_logs')
      .update({ status: NOTIFICATION_STATUS.PROCESSING })
      .eq('message_id', messageId);

    const { data: vendor } = await supabase
      .from('vendors')
      .select('*')
      .eq('channel', channel)
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .limit(1)
      .maybeSingle();

    try {
      let result;
      if (channel === CHANNELS.WHATSAPP) {
        result = await sendWhatsAppMessage({ recipient, body, templateCode, variables, credentials: vendor?.credentials });
      } else if (channel === CHANNELS.EMAIL) {
        result = await sendEmailMessage({ recipient, subject, body, credentials: vendor?.credentials });
      } else {
        throw new Error(`Unsupported channel: ${channel}`);
      }

      await supabase
        .from('notification_logs')
        .update({ status: NOTIFICATION_STATUS.SENT, sent_at: new Date().toISOString(), vendor_id: vendor?.id || null })
        .eq('message_id', messageId);

      await webhookQueue.add('deliver-webhook', { messageId, projectId, status: NOTIFICATION_STATUS.SENT, timestamp: new Date().toISOString() });

      return result;
    } catch (err) {
      logger.error({ messageId, err: err.message }, 'Job failed');

      await supabase
        .from('notification_logs')
        .update({ status: NOTIFICATION_STATUS.FAILED, error_message: err.message })
        .eq('message_id', messageId);

      await webhookQueue.add('deliver-webhook', { messageId, projectId, status: NOTIFICATION_STATUS.FAILED, error: err.message, timestamp: new Date().toISOString() });

      throw err;
    }
  },
  { connection: redisConfig, concurrency: 5 }
);

worker.on('completed', (job) => logger.info({ messageId: job.data.messageId }, 'Job completed'));
worker.on('failed', (job, err) => logger.error({ messageId: job.data.messageId, err: err.message }, 'Job failed permanently'));

logger.info('Dispatch Service Worker started');
