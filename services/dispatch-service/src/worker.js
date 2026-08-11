import { Worker, Queue } from 'bullmq';
import { NOTIFICATION_STATUS, CHANNELS, QUEUE_NAMES, createLogger } from '@notification-gateway/shared';
import { config } from './config/env.js';
import { sendWhatsAppMessage } from './vendors/whatsapp.js';
import { sendEmailMessage } from './vendors/email.js';
import * as dispatchRepository from './repositories/dispatchRepository.js';

const logger = createLogger('dispatch-service');
const webhookQueue = new Queue(QUEUE_NAMES.WEBHOOK_DELIVERY, { connection: config.redis });

// Worker: memproses pengiriman notifikasi utama via queue BullMQ
const worker = new Worker(
  QUEUE_NAMES.NOTIFICATION_DISPATCH,
  async (job) => {
    const { messageId, projectId, channel, recipient, templateCode, variables, body, subject } = job.data;
    logger.info({ messageId, channel, recipient }, 'Processing job');

    await dispatchRepository.updateStatusByMessageId(messageId, { status: NOTIFICATION_STATUS.PROCESSING });

    const vendorRecord = await dispatchRepository.findActiveVendorByChannel(channel);

    try {
      let dispatchResult;
      if (channel === CHANNELS.WHATSAPP) {
        dispatchResult = await sendWhatsAppMessage({ recipient, body, templateCode, variables, credentials: vendorRecord?.credentials });
      } else if (channel === CHANNELS.EMAIL) {
        dispatchResult = await sendEmailMessage({ recipient, subject, body, credentials: vendorRecord?.credentials });
      } else {
        throw new Error(`Unsupported channel: ${channel}`);
      }

      await dispatchRepository.updateStatusByMessageId(messageId, {
        status: NOTIFICATION_STATUS.SENT,
        sent_at: new Date().toISOString(),
        vendor_id: vendorRecord?.id || null
      });

      await webhookQueue.add('deliver-webhook', { messageId, projectId, status: NOTIFICATION_STATUS.SENT, timestamp: new Date().toISOString() });

      return dispatchResult;
    } catch (error) {
      logger.error({ messageId, err: error.message }, 'Job failed');

      await dispatchRepository.updateStatusByMessageId(messageId, {
        status: NOTIFICATION_STATUS.FAILED,
        error_message: error.message
      });

      await webhookQueue.add('deliver-webhook', { messageId, projectId, status: NOTIFICATION_STATUS.FAILED, error: error.message, timestamp: new Date().toISOString() });

      throw error;
    }
  },
  { connection: config.redis, concurrency: 5 }
);

worker.on('completed', (job) => logger.info({ messageId: job.data.messageId }, 'Job completed'));
worker.on('failed', (job, error) => logger.error({ messageId: job.data.messageId, err: error.message }, 'Job failed permanently'));

logger.info('Dispatch Service Worker started');
