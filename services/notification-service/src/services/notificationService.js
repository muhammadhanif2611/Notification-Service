import { supabase } from '@notification-gateway/database';
import { CHANNELS, NOTIFICATION_STATUS, sendNotificationSchema } from '@notification-gateway/shared';
import { whatsappQueue, emailQueue } from '../config/queue.js';
import { AppError } from '../middlewares/errorHandler.js';
import { randomBytes } from 'node:crypto';

// =========================================================================
// PRIVATE HELPERS
// =========================================================================

/**
 * Generate a unique message ID with nanosecond-level entropy.
 */
function generateMessageId() {
  const entropy = randomBytes(4).toString('hex');
  return `msg_${Date.now()}_${entropy}`;
}

/**
 * Generate a unique broadcast ID.
 */
function generateBroadcastId() {
  const entropy = randomBytes(4).toString('hex');
  return `bcast_${Date.now()}_${entropy}`;
}

/**
 * Determine if the request is in sandbox mode based on API key prefix or environment.
 * @param {string} apiKeyPrefix - The prefix of the used API key.
 * @param {string} environment - The environment string ('sandbox' | 'production').
 */
function isSandboxMode(apiKeyPrefix, environment) {
  return environment === 'sandbox' || apiKeyPrefix === 'ngw_sand_';
}

/**
 * Resolve the final message body for a notification.
 * If a templateCode is provided, fetches and renders the approved template.
 * @param {string} projectId
 * @param {string} channel
 * @param {string|undefined} templateCode
 * @param {string|undefined} body
 * @param {Record<string, string>|undefined} variables
 * @returns {{ resolvedBody: string, resolvedSubject: string|null }}
 */
async function resolveMessageContent(projectId, channel, templateCode, body, variables) {
  if (!templateCode) {
    return { resolvedBody: body, resolvedSubject: null };
  }

  const { data: template, error } = await supabase
    .from('templates')
    .select('body, subject, variables, status')
    .eq('code', templateCode)
    .eq('channel', channel.toUpperCase())
    .eq('project_id', projectId)
    .maybeSingle();

  if (error || !template) {
    throw new AppError(`Template '${templateCode}' not found for this project/channel.`, 404, 'TEMPLATE_NOT_FOUND');
  }

  if (template.status !== 'APPROVED') {
    throw new AppError(
      `Template '${templateCode}' is not approved (status: ${template.status}).`,
      422,
      'TEMPLATE_NOT_APPROVED'
    );
  }

  // Interpolate {{variable}} placeholders
  let resolvedBody = template.body;
  if (variables && typeof variables === 'object') {
    for (const [key, value] of Object.entries(variables)) {
      resolvedBody = resolvedBody.replaceAll(`{{${key}}}`, value);
    }
  }

  return {
    resolvedBody,
    resolvedSubject: template.subject ?? null
  };
}

/**
 * Check project quota and rate limit thresholds.
 * @param {string} projectId
 */
async function checkProjectThreshold(projectId) {
  const { data: project, error } = await supabase
    .from('projects')
    .select('id, name, daily_quota, rate_limit_per_min, is_active')
    .eq('id', projectId)
    .maybeSingle();

  if (error || !project) {
    throw new AppError('Associated project not found.', 404, 'PROJECT_NOT_FOUND');
  }

  if (!project.is_active) {
    throw new AppError('Project is inactive. Notification rejected.', 403, 'PROJECT_INACTIVE');
  }

  // Count today's total dispatched notifications
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { count: todayCount, error: countError } = await supabase
    .from('notification_logs')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .gte('created_at', todayStart.toISOString());

  if (countError) {
    throw new AppError(`Quota check failed: ${countError.message}`, 500, 'DATABASE_ERROR');
  }

  if (todayCount >= project.daily_quota) {
    throw new AppError(
      `Daily quota of ${project.daily_quota} notifications has been reached for this project.`,
      429,
      'DAILY_QUOTA_EXCEEDED'
    );
  }

  return project;
}

/**
 * Persist a new notification_log record to Supabase with QUEUED status.
 * @returns {object} The newly inserted notification log record.
 */
async function persistNotificationLog({ messageId, projectId, channel, recipient, payload, isSandbox }) {
  const { data: log, error } = await supabase
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

  if (error) {
    throw new AppError(`Failed to persist notification log: ${error.message}`, 500, 'DATABASE_ERROR');
  }

  return log;
}

/**
 * Push a job payload to the correct BullMQ channel queue.
 * @param {string} channel - 'WHATSAPP' | 'EMAIL'
 * @param {object} jobPayload
 */
async function enqueueJob(channel, jobPayload) {
  if (channel === CHANNELS.WHATSAPP) {
    await whatsappQueue.add('send-whatsapp', jobPayload);
  } else {
    await emailQueue.add('send-email', jobPayload);
  }
}

// =========================================================================
// PUBLIC SERVICE METHODS
// =========================================================================

export class NotificationService {
  /**
   * Process a single notification request:
   * 1. Validate request schema (Zod)
   * 2. Check project threshold & quota
   * 3. Resolve message content (template or inline body)
   * 4. Persist QUEUED log to DB
   * 5. Enqueue job to BullMQ
   * 6. Return fast 202 Accepted response payload
   */
  static async processNotification({ body: reqBody, project, environment, apiKeyPrefix }) {
    // 1. Validate with Zod schema
    const parse = sendNotificationSchema.safeParse(reqBody);
    if (!parse.success) {
      throw new AppError(
        'Invalid notification payload.',
        400,
        'VALIDATION_ERROR',
        parse.error.errors
      );
    }

    const { channel, recipient, templateCode, variables, body, subject } = parse.data;
    const projectId = project?.id;
    const sandbox = isSandboxMode(apiKeyPrefix, environment);
    const normalizedChannel = channel.toUpperCase();

    // 2. Check project threshold & quota (skip detailed check in sandbox mode)
    if (!sandbox) {
      await checkProjectThreshold(projectId);
    }

    // 3. Resolve message content
    const { resolvedBody, resolvedSubject } = await resolveMessageContent(
      projectId,
      normalizedChannel,
      templateCode,
      body,
      variables
    );

    // 4. Persist QUEUED log
    const messageId = generateMessageId();
    await persistNotificationLog({
      messageId,
      projectId,
      channel: normalizedChannel,
      recipient,
      payload: { templateCode, variables, body: resolvedBody, subject: resolvedSubject ?? subject },
      isSandbox: sandbox
    });

    // 5. Enqueue job to BullMQ
    const jobPayload = {
      messageId,
      projectId,
      channel: normalizedChannel,
      recipient,
      body: resolvedBody,
      subject: resolvedSubject ?? subject ?? null,
      templateCode: templateCode ?? null,
      variables: variables ?? {},
      isSandbox: sandbox,
      createdAt: new Date().toISOString()
    };
    await enqueueJob(normalizedChannel, jobPayload);

    // 6. Return accepted response payload
    return {
      messageId,
      status: NOTIFICATION_STATUS.QUEUED,
      channel: normalizedChannel,
      recipient,
      isSandbox: sandbox,
      acceptedAt: new Date().toISOString()
    };
  }

  /**
   * Process a broadcast to multiple recipients.
   * Each recipient gets its own messageId, log entry, and BullMQ job.
   * NOTE: Quota checks apply to the total recipient count.
   */
  static async processBroadcast({ channel, recipients, templateCode, body, subject, variables, project, isSandbox = false }) {
    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw new AppError('recipients must be a non-empty array.', 400, 'VALIDATION_ERROR');
    }

    if (!channel) {
      throw new AppError('channel is required for broadcast.', 400, 'VALIDATION_ERROR');
    }

    const projectId = project?.id;
    const normalizedChannel = channel.toUpperCase();
    const broadcastId = generateBroadcastId();

    // Quota check for total recipients
    if (!isSandbox) {
      const proj = await checkProjectThreshold(projectId);
      const { count: todayCount } = await supabase
        .from('notification_logs')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .gte('created_at', new Date(new Date().setUTCHours(0, 0, 0, 0)).toISOString());

      const remainingQuota = proj.daily_quota - (todayCount || 0);
      if (recipients.length > remainingQuota) {
        throw new AppError(
          `Broadcast exceeds daily quota. Remaining: ${remainingQuota}, Requested: ${recipients.length}.`,
          429,
          'DAILY_QUOTA_EXCEEDED'
        );
      }
    }

    // Resolve template once for all recipients
    const { resolvedBody, resolvedSubject } = await resolveMessageContent(
      projectId,
      normalizedChannel,
      templateCode,
      body,
      variables
    );

    // Enqueue a job per recipient
    const results = [];
    for (const recipient of recipients) {
      const messageId = generateMessageId();

      await persistNotificationLog({
        messageId,
        projectId,
        channel: normalizedChannel,
        recipient,
        payload: { templateCode, body: resolvedBody, subject: resolvedSubject ?? subject, isBroadcast: true, broadcastId },
        isSandbox
      });

      await enqueueJob(normalizedChannel, {
        messageId,
        broadcastId,
        projectId,
        channel: normalizedChannel,
        recipient,
        body: resolvedBody,
        subject: resolvedSubject ?? subject ?? null,
        templateCode: templateCode ?? null,
        isSandbox,
        isBroadcast: true,
        createdAt: new Date().toISOString()
      });

      results.push({ recipient, messageId });
    }

    return {
      broadcastId,
      channel: normalizedChannel,
      totalQueued: results.length,
      isSandbox,
      recipients: results,
      acceptedAt: new Date().toISOString()
    };
  }

  /**
   * Retrieve notification logs for a given project with pagination.
   */
  static async getNotificationLogs({ projectId, page = 1, limit = 20, status = null, channel = null }) {
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

    const { data: logs, count, error } = await query;
    if (error) throw new AppError(`Failed to fetch logs: ${error.message}`, 500, 'DATABASE_ERROR');

    return {
      data: logs,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit)
      }
    };
  }

  /**
   * Get a single notification log by messageId.
   */
  static async getNotificationByMessageId(messageId) {
    const { data: log, error } = await supabase
      .from('notification_logs')
      .select('*')
      .eq('message_id', messageId)
      .maybeSingle();

    if (error || !log) {
      throw new AppError(`Notification with messageId '${messageId}' not found.`, 404, 'NOT_FOUND');
    }

    return log;
  }
}
