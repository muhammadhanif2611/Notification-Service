import { CHANNELS, NOTIFICATION_STATUS, sendNotificationSchema, checkRateLimit, createLogger } from '@notification-gateway/shared';
import { whatsappQueue, emailQueue } from '../config/queue.js';
import { config } from '../config/env.js';
import { AppError } from '../middlewares/errorHandler.js';
import { randomBytes } from 'node:crypto';
import * as templateRepository from '../repositories/templateRepository.js';
import * as projectRepository from '../repositories/projectRepository.js';
import * as notificationLogRepository from '../repositories/notificationLogRepository.js';

const logger = createLogger('notification-service');

// Layanan validasi kuota, rate limit, resolusi template, dan antrean BullMQ untuk pengiriman tunggal & broadcast.
function generateMessageId() {
  return `msg_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

function generateBroadcastId() {
  return `bcast_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

function isSandboxMode(apiKeyPrefix, environment) {
  return environment === 'sandbox' || apiKeyPrefix === 'ngw_sand_';
}

async function resolveMessageContent(projectId, channel, templateCode, body, variables) {
  if (!templateCode) return { resolvedBody: body, resolvedSubject: null };

  const template = await templateRepository.findTemplate(templateCode, channel, projectId);
  if (!template) {
    throw new AppError(`Template '${templateCode}' not found for this project/channel.`, 404, 'TEMPLATE_NOT_FOUND');
  }

  let resolvedBody = template.body;
  if (variables && typeof variables === 'object') {
    resolvedBody = replaceTemplateVariables(resolvedBody, variables);
  }

  return { resolvedBody, resolvedSubject: template.subject ?? null };
}

async function resolveRawBody(projectId, channel, templateCode, body) {
  if (!templateCode) return { rawBody: body, resolvedSubject: null };

  const template = await templateRepository.findTemplate(templateCode, channel, projectId);
  if (!template) {
    throw new AppError(`Template '${templateCode}' not found for this project/channel.`, 404, 'TEMPLATE_NOT_FOUND');
  }

  return { rawBody: template.body, resolvedSubject: template.subject ?? null };
}

function replaceTemplateVariables(body, variables) {
  if (!variables || typeof variables !== 'object') return body;
  let result = body;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{{${key}}}`, String(value));
  }
  return result;
}

async function checkProjectThreshold(projectId) {
  const project = await projectRepository.findByIdWithQuota(projectId);
  if (!project) throw new AppError('Associated project not found.', 404, 'PROJECT_NOT_FOUND');
  if (!project.is_active) throw new AppError('Project is inactive.', 403, 'PROJECT_INACTIVE');

  const todayCount = await notificationLogRepository.countTodayByProject(projectId);
  if (todayCount >= project.daily_quota) {
    throw new AppError(`Daily quota of ${project.daily_quota} has been reached.`, 429, 'DAILY_QUOTA_EXCEEDED');
  }

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

export async function processNotification({ body: reqBody, project, environment, apiKeyPrefix }) {
  const validation = sendNotificationSchema.safeParse(reqBody);
  if (!validation.success) {
    throw new AppError('Invalid notification payload.', 400, 'VALIDATION_ERROR', validation.error.errors);
  }

  const { channel, recipient, templateCode, variables, body, subject } = validation.data;
  const projectId = project?.id;
  const isSandbox = isSandboxMode(apiKeyPrefix, environment);
  const normalizedChannel = channel.toUpperCase();

  const suppressed = await notificationLogRepository.findSuppressedContacts([recipient], normalizedChannel);
  if (suppressed.length > 0) {
    throw new AppError(`Recipient '${recipient}' is in the suppression list (${suppressed[0].reason}).`, 422, 'RECIPIENT_SUPPRESSED');
  }

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

export async function processBroadcast({ channel, recipients, templateCode, body, subject, variables, recipientVariables, project, isSandbox = false }) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new AppError('recipients must be a non-empty array.', 400, 'VALIDATION_ERROR');
  }
  if (!channel) {
    throw new AppError('channel is required for broadcast.', 400, 'VALIDATION_ERROR');
  }

  const projectId = project?.id;
  const normalizedChannel = channel.toUpperCase();
  const broadcastId = generateBroadcastId();

  const suppressedRows = await notificationLogRepository.findSuppressedContacts(recipients, normalizedChannel);
  const suppressedSet = new Set(suppressedRows.map((r) => r.contact));
  const activeRecipients = recipients.filter((r) => !suppressedSet.has(r));
  if (activeRecipients.length === 0) {
    throw new AppError('All recipients are in the suppression list.', 422, 'RECIPIENT_SUPPRESSED');
  }

  if (!isSandbox) {
    const { project: projectRecord, todayCount } = await checkProjectThreshold(projectId);
    const remainingQuota = projectRecord.daily_quota - todayCount;
    if (activeRecipients.length > remainingQuota) {
      throw new AppError(`Broadcast exceeds quota. Remaining: ${remainingQuota}, Requested: ${activeRecipients.length}.`, 429, 'DAILY_QUOTA_EXCEEDED');
    }

    const perMinuteLimit = projectRecord.rate_limit_per_min ?? 100;
    const rateResult = await checkRateLimit({
      key: `ratelimit:project:${projectId}`,
      limit: perMinuteLimit,
      windowMs: 60000,
      count: activeRecipients.length,
      redisConfig: config.redis
    });
    if (!rateResult.allowed) {
      const retryAfterSec = Math.ceil(rateResult.retryAfterMs / 1000);
      throw new AppError(
        `Broadcast ${activeRecipients.length} pesan melebihi rate limit ${perMinuteLimit} pesan/menit (sisa ${rateResult.remaining}). Coba lagi dalam ${retryAfterSec} detik atau pecah menjadi batch lebih kecil.`,
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }
  }

  const { rawBody, resolvedSubject } = await resolveRawBody(projectId, normalizedChannel, templateCode, body);
  const finalSubject = resolvedSubject ?? subject;

  const queuedResults = activeRecipients.map((recipient) => {
    const messageId = generateMessageId();
    const perRecipientVars = (recipientVariables && typeof recipientVariables === 'object')
      ? recipientVariables[recipient]
      : null;
    const mergedVars = { ...(variables ?? {}), ...(perRecipientVars ?? {}) };
    const finalBody = replaceTemplateVariables(rawBody, mergedVars);

    logger.debug({ recipient, messageId }, 'Broadcast message prepared');
    return { recipient, messageId, finalBody };
  });
  const createdAt = new Date().toISOString();

  const logRows = queuedResults.map(({ recipient, messageId, finalBody }) => ({
    message_id: messageId,
    project_id: projectId,
    channel: normalizedChannel,
    recipient,
    payload: { templateCode, body: finalBody, subject: finalSubject, isBroadcast: true, broadcastId, isSandbox }
  }));

  const jobPayloads = queuedResults.map(({ recipient, messageId, finalBody }) => ({
    name: normalizedChannel === CHANNELS.WHATSAPP ? 'send-whatsapp' : 'send-email',
    data: {
      messageId,
      projectId,
      channel: normalizedChannel,
      recipient,
      body: finalBody,
      subject: finalSubject,
      templateCode: templateCode ?? null,
      variables: variables ?? {},
      isSandbox,
      createdAt,
      broadcastId,
      isBroadcast: true
    }
  }));

  await notificationLogRepository.insertMany(logRows);

  const targetQueue = normalizedChannel === CHANNELS.WHATSAPP ? whatsappQueue : emailQueue;
  await targetQueue.addBulk(jobPayloads);

  return {
    broadcastId,
    channel: normalizedChannel,
    totalQueued: queuedResults.length,
    suppressedCount: suppressedSet.size,
    isSandbox,
    recipients: queuedResults,
    acceptedAt: createdAt
  };
}
