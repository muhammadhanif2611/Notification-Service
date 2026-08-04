import express from 'express';
import dotenv from 'dotenv';
import { Queue } from 'bullmq';
import { supabase } from '@notification-gateway/database';
import { NOTIFICATION_STATUS, CHANNELS, sendNotificationSchema } from '@notification-gateway/shared';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(express.json());

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined
};

const whatsappQueue = new Queue('whatsapp-queue', { connection: redisConfig });
const emailQueue = new Queue('email-queue', { connection: redisConfig });

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() });
});

// POST /notifications/process - Process Notification Ingestion
app.post('/notifications/process', async (req, res) => {
  const parse = sendNotificationSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ success: false, error: parse.error.errors });
  }

  const { channel, recipient, templateCode, variables, body, subject } = parse.data;
  const project = req.body.project || { id: '00000000-0000-0000-0000-000000000000' };
  const environment = req.body.environment || 'production';
  const isSandbox = environment === 'sandbox' || req.body.apiKeyPrefix === 'ngw_sand_';

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    // 1. Log to Supabase
    await supabase.from('notification_logs').insert({
      message_id: messageId,
      project_id: project.id,
      channel: channel.toUpperCase(),
      recipient,
      payload: { templateCode, variables, body, subject, isSandbox },
      status: NOTIFICATION_STATUS.QUEUED
    });

    const jobPayload = {
      messageId,
      projectId: project.id,
      channel: channel.toUpperCase(),
      recipient,
      templateCode,
      variables,
      body,
      subject,
      isSandbox,
      createdAt: new Date().toISOString()
    };

    // 2. Queue into specific BullMQ queue
    if (channel.toUpperCase() === CHANNELS.WHATSAPP) {
      await whatsappQueue.add('send-whatsapp', jobPayload, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    } else {
      await emailQueue.add('send-email', jobPayload, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });
    }

    // 3. Fast Response <50ms
    return res.status(202).json({
      success: true,
      messageId,
      status: NOTIFICATION_STATUS.QUEUED,
      recipient,
      channel: channel.toUpperCase(),
      isSandbox,
      acceptedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Notification Service Error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// POST /notifications/broadcast - Mass Broadcast Engine
app.post('/notifications/broadcast', async (req, res) => {
  const { recipients, channel, templateCode, body, subject, project } = req.body;

  if (!Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ success: false, error: 'recipients must be a non-empty array' });
  }

  const broadcastId = `bcast_${Date.now()}`;
  const results = [];

  for (const r of recipients) {
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const jobPayload = {
      messageId,
      broadcastId,
      projectId: project?.id || '00000000-0000-0000-0000-000000000000',
      channel: channel.toUpperCase(),
      recipient: r,
      templateCode,
      body,
      subject,
      isBroadcast: true
    };

    if (channel.toUpperCase() === CHANNELS.WHATSAPP) {
      await whatsappQueue.add('send-whatsapp', jobPayload);
    } else {
      await emailQueue.add('send-email', jobPayload);
    }
    results.push({ recipient: r, messageId });
  }

  return res.status(202).json({
    success: true,
    broadcastId,
    totalQueued: results.length,
    recipients: results
  });
});

app.listen(PORT, () => {
  console.log(`📡 Notification Service running on http://localhost:${PORT}`);
});
