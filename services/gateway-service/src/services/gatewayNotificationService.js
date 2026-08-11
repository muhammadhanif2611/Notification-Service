import { Queue } from 'bullmq';
import { NOTIFICATION_STATUS, QUEUE_NAMES, sendNotificationSchema, createLogger } from '@notification-gateway/shared';
import { config } from '../config/env.js';
import * as notificationLogRepository from '../repositories/notificationLogRepository.js';

const logger = createLogger('gateway-service');
const dispatchQueue = new Queue(QUEUE_NAMES.NOTIFICATION_DISPATCH, { connection: config.redis });

// Layanan penerimaan dan antrean notifikasi masuk
export async function ingestNotification({ reqBody, project, environment }) {
  const parse = sendNotificationSchema.safeParse(reqBody);
  if (!parse.success) {
    throw { statusCode: 400, code: 'VALIDATION_ERROR', message: 'Invalid notification request body', details: parse.error.errors };
  }

  const { channel, recipient, templateCode, variables, body, subject } = parse.data;
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    await notificationLogRepository.insert({
      message_id: messageId,
      project_id: project.id,
      channel: channel.toUpperCase(),
      recipient,
      payload: { templateCode, variables, body, subject },
      status: NOTIFICATION_STATUS.PENDING
    });
  } catch (logError) {
    logger.warn({ logError }, 'Failed to log notification');
  }

  await dispatchQueue.add('send-notification', {
    messageId, projectId: project.id, channel: channel.toUpperCase(),
    recipient, templateCode, variables, body, subject,
    environment, createdAt: new Date().toISOString()
  }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });

  return {
    messageId,
    status: NOTIFICATION_STATUS.PENDING,
    recipient,
    channel: channel.toUpperCase(),
    acceptedAt: new Date().toISOString()
  };
}
