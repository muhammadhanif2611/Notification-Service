import { CHANNELS, NOTIFICATION_STATUS, sendNotificationSchema, checkRateLimit } from '@notification-gateway/shared';
import { whatsappQueue, emailQueue } from '../config/queue.js';
import { config } from '../config/env.js';
import { AppError } from '../middlewares/errorHandler.js';
import { randomBytes } from 'node:crypto';
import * as templateRepository from '../repositories/templateRepository.js';
import * as projectRepository from '../repositories/projectRepository.js';
import * as notificationLogRepository from '../repositories/notificationLogRepository.js';

// Helper membuat ID pesan unik
function generateMessageId() {
  return `msg_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

// Helper membuat ID broadcast unik
function generateBroadcastId() {
  return `bcast_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

// Helper mengecek status mode sandbox
function isSandboxMode(apiKeyPrefix, environment) {
  return environment === 'sandbox' || apiKeyPrefix === 'ngw_sand_';
}

// Helper menyelesaikan isi konten pesan dari template
async function resolveMessageContent(projectId, channel, templateCode, body, variables) {
  if (!templateCode) return { resolvedBody: body, resolvedSubject: null };

  const template = await templateRepository.findApprovedTemplate(templateCode, channel, projectId);
  if (!template) {
    throw new AppError(`Template '${templateCode}' not found for this project/channel.`, 404, 'TEMPLATE_NOT_FOUND');
  }

  let resolvedBody = template.body;
  if (variables && typeof variables === 'object') {
    for (const [key, value] of Object.entries(variables)) {
      resolvedBody = resolvedBody.replaceAll(`{{${key}}}`, value);
    }
  }

  return { resolvedBody, resolvedSubject: template.subject ?? null };
}

// Helper mengecek kuota harian & status keaktifan project
// Return { project, todayCount } agar caller tidak perlu query countTodayByProject ulang
async function checkProjectThreshold(projectId) {
  const project = await projectRepository.findByIdWithQuota(projectId);
  if (!project) throw new AppError('Associated project not found.', 404, 'PROJECT_NOT_FOUND');
  if (!project.is_active) throw new AppError('Project is inactive.', 403, 'PROJECT_INACTIVE');

  const todayCount = await notificationLogRepository.countTodayByProject(projectId);
  if (todayCount >= project.daily_quota) {
    throw new AppError(`Daily quota of ${project.daily_quota} has been reached.`, 429, 'DAILY_QUOTA_EXCEEDED');
  }

  // Real-time rate limit per menit (Redis Sliding Window) berdasarkan rate_limit_per_min project
  const perMinuteLimit = project.rate_limit_per_min ?? 100;
  const rateResult = await checkRateLimit({
    key: `ratelimit:project:${projectId}`,
    limit: perMinuteLimit,
    windowMs: 60000,
    redisConfig: config.redis
  });
  if (!rateResult.allowed) {
    const retryAfterSec = Math.ceil(rateResult.retryAfterMs / 1000);
    throw new AppError(
      `Rate limit ${perMinuteLimit} request/menit terlampaui. Coba lagi dalam ${retryAfterSec} detik.`,
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  }

  return { project, todayCount };
}

// Helper menyimpan log dan memasukkan job ke antrean BullMQ
async function persistAndEnqueue({ messageId, projectId, channel, recipient, payload, isSandbox, subject, body, templateCode, variables, broadcastId }) {
  await notificationLogRepository.insert({
    message_id: messageId,
    project_id: projectId,
    channel,
    recipient,
    payload: { ...payload, isSandbox }
  });

  const jobPayload = {
    messageId,
    projectId,
    channel,
    recipient,
    body,
    subject: subject ?? null,
    templateCode: templateCode ?? null,
    variables: variables ?? {},
    isSandbox,
    createdAt: new Date().toISOString(),
    ...(broadcastId ? { broadcastId, isBroadcast: true } : {})
  };

  if (channel === CHANNELS.WHATSAPP) {
    await whatsappQueue.add('send-whatsapp', jobPayload);
  } else {
    await emailQueue.add('send-email', jobPayload);
  }
}

// Layanan memproses pengiriman notifikasi tunggal
export async function processNotification({ body: reqBody, project, environment, apiKeyPrefix }) {
  const validation = sendNotificationSchema.safeParse(reqBody);
  if (!validation.success) {
    throw new AppError('Invalid notification payload.', 400, 'VALIDATION_ERROR', validation.error.errors);
  }

  const { channel, recipient, templateCode, variables, body, subject } = validation.data;
  const projectId = project?.id;
  const isSandbox = isSandboxMode(apiKeyPrefix, environment);
  const normalizedChannel = channel.toUpperCase();

  if (!isSandbox) {
    await checkProjectThreshold(projectId);
  }

  const { resolvedBody, resolvedSubject } = await resolveMessageContent(projectId, normalizedChannel, templateCode, body, variables);
  const messageId = generateMessageId();

  await persistAndEnqueue({
    messageId,
    projectId,
    channel: normalizedChannel,
    recipient,
    payload: { templateCode, variables, body: resolvedBody, subject: resolvedSubject ?? subject },
    isSandbox,
    subject: resolvedSubject ?? subject,
    body: resolvedBody,
    templateCode,
    variables
  });

  return {
    messageId,
    status: NOTIFICATION_STATUS.QUEUED,
    channel: normalizedChannel,
    recipient,
    isSandbox,
    acceptedAt: new Date().toISOString()
  };
}

// Layanan memproses pengiriman notifikasi masal (broadcast)
// Optimasi: batch insert 1 query ke DB + addBulk 1 call ke BullMQ (bukan N sequential await)
export async function processBroadcast({ channel, recipients, templateCode, body, subject, variables, project, isSandbox = false }) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new AppError('recipients must be a non-empty array.', 400, 'VALIDATION_ERROR');
  }
  if (!channel) {
    throw new AppError('channel is required for broadcast.', 400, 'VALIDATION_ERROR');
  }

  const projectId = project?.id;
  const normalizedChannel = channel.toUpperCase();
  const broadcastId = generateBroadcastId();

  if (!isSandbox) {
    const { project: projectRecord, todayCount } = await checkProjectThreshold(projectId);
    const remainingQuota = projectRecord.daily_quota - todayCount;
    if (recipients.length > remainingQuota) {
      throw new AppError(`Broadcast exceeds quota. Remaining: ${remainingQuota}, Requested: ${recipients.length}.`, 429, 'DAILY_QUOTA_EXCEEDED');
    }

    // Rate limit anti-spam untuk broadcast: N recipient memesan N slot pada jendela 1 menit.
    // Tanpa ini, satu panggil broadcast bisa melewati rate limit yang berlaku untuk single send.
    const perMinuteLimit = projectRecord.rate_limit_per_min ?? 100;
    const rateResult = await checkRateLimit({
      key: `ratelimit:project:${projectId}`,
      limit: perMinuteLimit,
      windowMs: 60000,
      count: recipients.length,
      redisConfig: config.redis
    });
    if (!rateResult.allowed) {
      const retryAfterSec = Math.ceil(rateResult.retryAfterMs / 1000);
      throw new AppError(
        `Broadcast ${recipients.length} pesan melebihi rate limit ${perMinuteLimit} pesan/menit (sisa ${rateResult.remaining}). Coba lagi dalam ${retryAfterSec} detik atau pecah menjadi batch lebih kecil.`,
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }
  }

  const { resolvedBody, resolvedSubject } = await resolveMessageContent(projectId, normalizedChannel, templateCode, body, variables);
  const finalSubject = resolvedSubject ?? subject;

  // Siapkan seluruh messageId, log rows, dan job payloads sekaligus
  const queuedResults = recipients.map((recipient) => ({ recipient, messageId: generateMessageId() }));
  const createdAt = new Date().toISOString();

  const logRows = queuedResults.map(({ recipient, messageId }) => ({
    message_id: messageId,
    project_id: projectId,
    channel: normalizedChannel,
    recipient,
    payload: { templateCode, body: resolvedBody, subject: finalSubject, isBroadcast: true, broadcastId, isSandbox }
  }));

  const jobPayloads = queuedResults.map(({ recipient, messageId }) => ({
    name: normalizedChannel === CHANNELS.WHATSAPP ? 'send-whatsapp' : 'send-email',
    data: {
      messageId,
      projectId,
      channel: normalizedChannel,
      recipient,
      body: resolvedBody,
      subject: finalSubject,
      templateCode: templateCode ?? null,
      variables: variables ?? {},
      isSandbox,
      createdAt,
      broadcastId,
      isBroadcast: true
    }
  }));

  // Batch insert 1 query + addBulk 1 call
  await notificationLogRepository.insertMany(logRows);

  const targetQueue = normalizedChannel === CHANNELS.WHATSAPP ? whatsappQueue : emailQueue;
  await targetQueue.addBulk(jobPayloads);

  return {
    broadcastId,
    channel: normalizedChannel,
    totalQueued: queuedResults.length,
    isSandbox,
    recipients: queuedResults,
    acceptedAt: createdAt
  };
}

// Layanan mengambil daftar riwayat log notifikasi
export async function getNotificationLogs({ projectId, page = 1, limit = 20, status = null, channel = null }) {
  const { data, count } = await notificationLogRepository.findPaginated({ projectId, page, limit, status, channel });
  return {
    data,
    pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) }
  };
}

// Layanan mengambil detail notifikasi by message ID
export async function getNotificationByMessageId(messageId) {
  const notification = await notificationLogRepository.findByMessageId(messageId);
  if (!notification) {
    throw new AppError(`Notification '${messageId}' not found.`, 404, 'NOT_FOUND');
  }
  return notification;
}
