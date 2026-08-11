import { Worker, Queue } from 'bullmq';
import { NOTIFICATION_STATUS, CHANNELS, QUEUE_NAMES, createLogger } from '@notification-gateway/shared';
import { config } from './config/env.js';
import { sendWhatsAppMessage } from './vendors/whatsapp.js';
import { sendEmailMessage } from './vendors/email.js';
import * as dispatchRepository from './repositories/dispatchRepository.js';

const logger = createLogger('dispatch-service');
const webhookQueue = new Queue(QUEUE_NAMES.WEBHOOK_DELIVERY, { connection: config.redis });

// Worker: proses pengiriman notifikasi utama via queue BullMQ
const worker = new Worker(
  QUEUE_NAMES.NOTIFICATION_DISPATCH,
  async (job) => {
    const { messageId, projectId, channel, recipient, templateCode, variables, body, subject } = job.data;
    logger.info({ messageId, channel, recipient }, 'Processing job');

    await dispatchRepository.updateStatusByMessageId(messageId, { status: NOTIFICATION_STATUS.PROCESSING });

    const vendor = await dispatchRepository.findActiveVendorByChannel(channel);

    try {
      let result;
      if (channel === CHANNELS.WHATSAPP) {
        result = await sendWhatsAppMessage({ recipient, body, templateCode, variables, credentials: vendor?.credentials });
      } else if (channel === CHANNELS.EMAIL) {
        result = await sendEmailMessage({ recipient, subject, body, credentials: vendor?.credentials });
      } else {
        throw new Error(`Unsupported channel: ${channel}`);
      }

      await dispatchRepository.updateStatusByMessageId(messageId, {
        status: NOTIFICATION_STATUS.SENT,
        sent_at: new Date().toISOString(),
        vendor_id: vendor?.id || null
      });

      await webhookQueue.add('deliver-webhook', { messageId, projectId, status: NOTIFICATION_STATUS.SENT, timestamp: new Date().toISOString() });

      return result;
    } catch (err) {
      logger.error({ messageId, err: err.message }, 'Job failed');

      await dispatchRepository.updateStatusByMessageId(messageId, {
        status: NOTIFICATION_STATUS.FAILED,
        error_message: err.message
      });

      await webhookQueue.add('deliver-webhook', { messageId, projectId, status: NOTIFICATION_STATUS.FAILED, error: err.message, timestamp: new Date().toISOString() });

      throw err;
    }
  },
  { connection: config.redis, concurrency: 5 }
);

worker.on('completed', (job) => logger.info({ messageId: job.data.messageId }, 'Job completed'));
worker.on('failed', (job, err) => logger.error({ messageId: job.data.messageId, err: err.message }, 'Job failed permanently'));

logger.info('Dispatch Service Worker started');
