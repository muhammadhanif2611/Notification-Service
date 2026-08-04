import express from 'express';
import { Queue } from 'bullmq';
import { supabase } from '@notification-gateway/database';
import { NOTIFICATION_STATUS, QUEUE_NAMES, sendNotificationSchema } from '@notification-gateway/shared';

const router = express.Router();

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined
};

const dispatchQueue = new Queue(QUEUE_NAMES.NOTIFICATION_DISPATCH, {
  connection: redisConfig
});

/**
 * POST /v1/notifications/send
 * High-speed notification ingestion endpoint (<50ms response time)
 */
router.post('/send', async (req, res) => {
  const validationResult = sendNotificationSchema.safeParse(req.body);

  if (!validationResult.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid notification request body',
        details: validationResult.error.errors
      }
    });
  }

  const { channel, recipient, templateCode, variables, body, subject } = validationResult.data;
  const project = req.project;
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    // 1. Log initial message as PENDING in Supabase
    const { error: logError } = await supabase
      .from('notification_logs')
      .insert({
        message_id: messageId,
        project_id: project.id,
        channel: channel.toUpperCase(),
        recipient,
        payload: { templateCode, variables, body, subject },
        status: NOTIFICATION_STATUS.PENDING
      });

    if (logError) {
      console.error('Failed to log notification in Supabase:', logError);
    }

    // 2. Push Job into BullMQ Redis Queue
    await dispatchQueue.add('send-notification', {
      messageId,
      projectId: project.id,
      channel: channel.toUpperCase(),
      recipient,
      templateCode,
      variables,
      body,
      subject,
      environment: req.environment,
      createdAt: new Date().toISOString()
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });

    // 3. Fast Response 202 Accepted (<50ms)
    return res.status(202).json({
      success: true,
      messageId,
      status: NOTIFICATION_STATUS.PENDING,
      recipient,
      channel: channel.toUpperCase(),
      acceptedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Ingestion Endpoint Error:', err);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to ingest notification request.'
      }
    });
  }
});

export default router;
