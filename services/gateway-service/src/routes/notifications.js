import express from 'express';
import { Queue } from 'bullmq';
import { supabase } from '@notification-gateway/database';
import { NOTIFICATION_STATUS, QUEUE_NAMES, sendNotificationSchema, createLogger } from '@notification-gateway/shared';

const logger = createLogger('gateway-service');
const router = express.Router();

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined
};

const dispatchQueue = new Queue(QUEUE_NAMES.NOTIFICATION_DISPATCH, { connection: redisConfig });

// POST /v1/notifications/send
router.post('/send', async (req, res) => {
  const parse = sendNotificationSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid notification request body', details: parse.error.errors } });
  }

  const { channel, recipient, templateCode, variables, body, subject } = parse.data;
  const project = req.project;
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    const { error: logError } = await supabase.from('notification_logs').insert({
      message_id: messageId,
      project_id: project.id,
      channel: channel.toUpperCase(),
      recipient,
      payload: { templateCode, variables, body, subject },
      status: NOTIFICATION_STATUS.PENDING
    });
    if (logError) logger.warn({ logError }, 'Failed to log notification');

    await dispatchQueue.add('send-notification', {
      messageId, projectId: project.id, channel: channel.toUpperCase(),
      recipient, templateCode, variables, body, subject,
      environment: req.environment, createdAt: new Date().toISOString()
    }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });

    return res.status(202).json({
      success: true, messageId,
      status: NOTIFICATION_STATUS.PENDING,
      recipient, channel: channel.toUpperCase(),
      acceptedAt: new Date().toISOString()
    });
  } catch (err) {
    logger.error({ err: err.message }, 'Ingestion endpoint error');
    return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to ingest notification request.' } });
  }
});

export default router;
