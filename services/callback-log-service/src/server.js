import express from 'express';
import dotenv from 'dotenv';
import { Worker } from 'bullmq';
import { supabase } from '@notification-gateway/database';
import { generateWebhookSignature, NOTIFICATION_STATUS } from '@notification-gateway/shared';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

app.use(express.json());

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined
};

console.log('🔔 Callback & Log Microservice Worker starting...');

// BullMQ Worker consuming status-queue
const worker = new Worker('status-queue', async (job) => {
  const { messageId, projectId, status, error, vendorId } = job.data;
  console.log(`[Callback Worker] Updating ${messageId} -> ${status}`);

  // 1. Update Supabase log
  await supabase.from('notification_logs').update({
    status: status === 'SENT' ? NOTIFICATION_STATUS.SENT : NOTIFICATION_STATUS.FAILED,
    error_message: error || null,
    vendor_id: vendorId || null,
    sent_at: status === 'SENT' ? new Date().toISOString() : null
  }).eq('message_id', messageId);

  // 2. Fetch Project for webhook details
  const { data: project } = await supabase.from('projects').select('webhook_url, webhook_secret').eq('id', projectId).maybeSingle();

  if (project && project.webhook_url) {
    const payload = { event: 'notification.status_update', messageId, status, error: error || null, timestamp: new Date().toISOString() };
    const signature = generateWebhookSignature(payload, project.webhook_secret || 'default_secret');

    try {
      await fetch(project.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Gateway-Signature': signature },
        body: JSON.stringify(payload)
      });
      console.log(`✅ [Webhook Signed Sent] ${messageId} -> ${project.webhook_url}`);
    } catch (err) {
      console.error(`❌ [Webhook Error] ${project.webhook_url}:`, err.message);
    }
  }
}, { connection: redisConfig });

// GET /logs - Dashboard History & Analytics
app.get('/logs', async (req, res) => {
  try {
    const { data: logs, error } = await supabase.from('notification_logs').select('*, projects(name)').order('created_at', { ascending: false }).limit(100);
    if (error) throw error;
    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// GET /statistics - Recharts Analytics Data
app.get('/statistics', async (req, res) => {
  try {
    const { data: logs, error } = await supabase.from('notification_logs').select('status, channel');
    if (error) throw error;

    const stats = {
      total: logs.length,
      sent: logs.filter(l => l.status === 'SENT').length,
      failed: logs.filter(l => l.status === 'FAILED').length,
      pending: logs.filter(l => l.status === 'PENDING' || l.status === 'QUEUED').length,
      whatsapp: logs.filter(l => l.channel === 'WHATSAPP').length,
      email: logs.filter(l => l.channel === 'EMAIL').length
    };

    return res.json({ success: true, stats });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`📊 Callback & Log Service running on http://localhost:${PORT}`);
});
