import { supabase } from '@notification-gateway/database';
import { CHANNELS, NOTIFICATION_STATUS, sendNotificationSchema } from '@notification-gateway/shared';
import { whatsappQueue, emailQueue } from '../config/queue.js';
import { AppError } from '../middlewares/errorHandler.js';
import { randomBytes } from 'node:crypto';

// --- Helpers ---

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

  const { data: template, error } = await supabase
    .from('templates')
    .select('body, subject, status')
    .eq('code', templateCode)
    .eq('channel', channel.toUpperCase())
    .eq('project_id', projectId)
    .maybeSingle();

  if (error || !template) {
    throw new AppError(`Template '${templateCode}' not found for this project/channel.`, 404, 'TEMPLATE_NOT_FOUND');
  }
  if (template.status !== 'APPROVED') {
    throw new AppError(`Template '${templateCode}' is not approved (status: ${template.status}).`, 422, 'TEMPLATE_NOT_APPROVED');
  }

  let resolvedBody = template.body;
  if (variables && typeof variables === 'object') {
    for (const [key, value] of Object.entries(variables)) {
      resolvedBody = resolvedBody.replaceAll(`{{${key}}}`, value);
    }
  }

  return { resolvedBody, resolvedSubject: template.subject ?? null };
}

async function checkProjectThreshold(projectId) {
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, daily_quota, rate_limit_per_min, is_active')
    .eq('id', projectId)
    .maybeSingle();

  if (error || !project) throw new AppError('Associated project not found.', 404, 'PROJECT_NOT_FOUND');
  if (!project.is_active) throw new AppError('Project is inactive.', 403, 'PROJECT_INACTIVE');

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count, error: countError } = await supabase
    .from('notification_logs')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .gte('created_at', todayStart.toISOString());

  if (countError) throw new AppError(`Quota check failed: ${countError.message}`, 500, 'DATABASE_ERROR');
  if (count >= project.daily_quota) {
    throw new AppError(`Daily quota of ${project.daily_quota} has been reached.`, 429, 'DAILY_QUOTA_EXCEEDED');
  }

  return project;
}

async function persistNotificationLog({ messageId, projectId, channel, recipient, payload, isSandbox }) {
  const { data, error } = await supabase
    .from('notification_logs')
    .insert({
      message_id: messageId,
      project_id: projectId,
      channel: channel.toUpperCase(),
      recipient,
      payload: { ...payload, isSandbox },
      status: NOTIFICATION_STATUS.QUEUED
    })
    .select('id, message_id, status, created_at')
    .single();

  if (error) throw new AppError(`Failed to persist log: ${error.message}`, 500, 'DATABASE_ERROR');
  return data;
}

async function enqueueJob(channel, jobPayload) {
  if (channel === CHANNELS.WHATSAPP) {
    await whatsappQueue.add('send-whatsapp', jobPayload);
  } else {
    await emailQueue.add('send-email', jobPayload);
  }
}

// --- Public Service Functions ---

export async function processNotification({ body: reqBody, project, environment, apiKeyPrefix }) {
  const parse = sendNotificationSchema.safeParse(reqBody);
  if (!parse.success) {
    throw new AppError('Invalid notification payload.', 400, 'VALIDATION_ERROR', parse.error.errors);
  }

  const { channel, recipient, templateCode, variables, body, subject } = parse.data;
  const projectId = project?.id;
  const sandbox = isSandboxMode(apiKeyPrefix, environment);
  const normalizedChannel = channel.toUpperCase();

  if (!sandbox) await checkProjectThreshold(projectId);

  const { resolvedBody, resolvedSubject } = await resolveMessageContent(projectId, normalizedChannel, templateCode, body, variables);

  const messageId = generateMessageId();
  await persistNotificationLog({
    messageId, projectId, channel: normalizedChannel, recipient,
    payload: { templateCode, variables, body: resolvedBody, subject: resolvedSubject ?? subject },
    isSandbox: sandbox
  });

  const jobPayload = {
    messageId, projectId, channel: normalizedChannel, recipient,
    body: resolvedBody, subject: resolvedSubject ?? subject ?? null,
    templateCode: templateCode ?? null, variables: variables ?? {},
    isSandbox: sandbox, createdAt: new Date().toISOString()
  };
  await enqueueJob(normalizedChannel, jobPayload);

  return { messageId, status: NOTIFICATION_STATUS.QUEUED, channel: normalizedChannel, recipient, isSandbox: sandbox, acceptedAt: new Date().toISOString() };
}

export async function processBroadcast({ channel, recipients, templateCode, body, subject, variables, project, isSandbox = false }) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new AppError('recipients must be a non-empty array.', 400, 'VALIDATION_ERROR');
  }
  if (!channel) throw new AppError('channel is required for broadcast.', 400, 'VALIDATION_ERROR');

  const projectId = project?.id;
  const normalizedChannel = channel.toUpperCase();
  const broadcastId = generateBroadcastId();

  if (!isSandbox) {
    const proj = await checkProjectThreshold(projectId);
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('notification_logs')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .gte('created_at', todayStart.toISOString());
    const remaining = proj.daily_quota - (count || 0);
    if (recipients.length > remaining) {
      throw new AppError(`Broadcast exceeds quota. Remaining: ${remaining}, Requested: ${recipients.length}.`, 429, 'DAILY_QUOTA_EXCEEDED');
    }
  }

  const { resolvedBody, resolvedSubject } = await resolveMessageContent(projectId, normalizedChannel, templateCode, body, variables);

  const results = [];
  for (const recipient of recipients) {
    const messageId = generateMessageId();
    await persistNotificationLog({
      messageId, projectId, channel: normalizedChannel, recipient,
      payload: { templateCode, body: resolvedBody, subject: resolvedSubject ?? subject, isBroadcast: true, broadcastId },
      isSandbox
    });
    await enqueueJob(normalizedChannel, {
      messageId, broadcastId, projectId, channel: normalizedChannel, recipient,
      body: resolvedBody, subject: resolvedSubject ?? subject ?? null,
      templateCode: templateCode ?? null, isSandbox, isBroadcast: true,
      createdAt: new Date().toISOString()
    });
    results.push({ recipient, messageId });
  }

  return { broadcastId, channel: normalizedChannel, totalQueued: results.length, isSandbox, recipients: results, acceptedAt: new Date().toISOString() };
}

export async function getNotificationLogs({ projectId, page = 1, limit = 20, status = null, channel = null }) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('notification_logs')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status) query = query.eq('status', status.toUpperCase());
  if (channel) query = query.eq('channel', channel.toUpperCase());

  const { data, count, error } = await query;
  if (error) throw new AppError(`Failed to fetch logs: ${error.message}`, 500, 'DATABASE_ERROR');

  return { data, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } };
}

export async function getNotificationByMessageId(messageId) {
  const { data, error } = await supabase
    .from('notification_logs')
    .select('*')
    .eq('message_id', messageId)
    .maybeSingle();
  if (error || !data) throw new AppError(`Notification '${messageId}' not found.`, 404, 'NOT_FOUND');
  return data;
}
