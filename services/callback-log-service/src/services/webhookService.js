import {
  generateWebhookSignature,
  signWebhookPayload,
  generateWebhookMessageId,
  createLogger,
  CircuitBreaker,
  DebouncedBatcher
} from '@notification-gateway/shared';
import * as callbackLogRepository from '../repositories/callbackLogRepository.js';

const logger = createLogger('callback-log-service:webhook');

// Timeout HTTP fetch webhook (5 detik) — mencegah blocking/hanging
const WEBHOOK_TIMEOUT_MS = 5000;
const WEBHOOK_MAX_ATTEMPTS = 3;
const WEBHOOK_BACKOFF_BASE_MS = 3000;

// Registry Circuit Breaker per target hostname untuk mencegah pemanggilan terus-menerus ke endpoint rusak
const circuitBreakers = new Map();

/**
 * Mendapatkan CircuitBreaker untuk URL webhook tertentu.
 * @param {string} webhookUrl
 * @returns {CircuitBreaker}
 */
function getCircuitBreaker(webhookUrl) {
  try {
    const { hostname } = new URL(webhookUrl);
    if (!circuitBreakers.has(hostname)) {
      circuitBreakers.set(hostname, new CircuitBreaker({
        name: hostname,
        failureThreshold: 4,
        cooldownMs: 30000 // 30 detik cooldown jika endpoint terus menerus gagal
      }));
    }
    return circuitBreakers.get(hostname);
  } catch {
    return new CircuitBreaker({ name: 'invalid-url', failureThreshold: 1, cooldownMs: 60000 });
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Mengirim satu batch atau single event webhook ke URL klien dengan retry + exponential backoff + circuit breaker.
 * @param {object} params
 * @param {string} params.webhookUrl
 * @param {string} params.webhookSecret
 * @param {Array<object>} params.events - Kumpulan event yang telah di-debounce
 * @returns {Promise<void>}
 */
async function dispatchWebhookPayload({ webhookUrl, webhookSecret, events }) {
  if (!events || events.length === 0) return;

  const breaker = getCircuitBreaker(webhookUrl);
  if (!breaker.canExecute()) {
    logger.warn({ url: webhookUrl }, 'Webhook delivery skipped: circuit breaker OPEN (endpoint cooldown)');
    return;
  }

  // Siapkan payload: jika 1 event, kirim format standar; jika multiple event, kirim array/batch
  const payload = events.length === 1
    ? events[0].payload
    : {
        type: 'notification.batch_update',
        created_at: new Date().toISOString(),
        data: events.map((e) => e.payload.data)
      };

  const primaryMessageId = events[0].messageId;
  const webhookId = generateWebhookMessageId();
  const webhookTimestamp = Math.floor(Date.now() / 1000).toString();
  const body = JSON.stringify(payload);
  const signature = signWebhookPayload({ id: webhookId, timestamp: webhookTimestamp, body, secret: webhookSecret });
  const legacySignature = generateWebhookSignature(payload, webhookSecret);

  let httpStatus = null;
  let deliveredAt = null;
  let lastError = null;

  for (let attempt = 1; attempt <= WEBHOOK_MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'webhook-id': webhookId,
          'webhook-timestamp': webhookTimestamp,
          'webhook-signature': signature,
          'X-Gateway-Signature': legacySignature
        },
        body,
        signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS)
      });

      httpStatus = response.status;
      deliveredAt = new Date().toISOString();

      if (!response.ok) {
        throw new Error(`Webhook endpoint returned HTTP ${response.status}`);
      }

      breaker.recordSuccess();
      logger.info({ url: webhookUrl, eventCount: events.length, attempt, httpStatus }, 'Debounced webhook delivered successfully');
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      breaker.recordFailure();
      logger.warn({ url: webhookUrl, attempt, err: err.message }, 'Webhook attempt failed');

      if (attempt < WEBHOOK_MAX_ATTEMPTS) {
        // Exponential backoff dengan jitter
        const jitter = Math.floor(Math.random() * 500);
        await sleep(WEBHOOK_BACKOFF_BASE_MS * 2 ** (attempt - 1) + jitter);
      }
    }
  }

  if (lastError) {
    logger.error({ url: webhookUrl, eventCount: events.length, err: lastError.message }, 'Webhook delivery failed permanently after retries');
  }

  // Catat webhook log untuk setiap event yang ada di dalam batch
  for (const item of events) {
    try {
      const logRecord = await callbackLogRepository.findLogIdByMessageId(item.messageId);
      await callbackLogRepository.insertWebhookLog({
        notificationId: logRecord?.id || null,
        messageId: item.messageId,
        webhookUrl,
        payloadSent: item.payload,
        signature: `${webhookId}@${webhookTimestamp} ${signature}`,
        httpStatus,
        deliveredAt
      });
    } catch (dbErr) {
      logger.error({ messageId: item.messageId, err: dbErr.message }, 'Failed to insert webhook log');
    }
  }
}

// Inisialisasi DebouncedBatcher:
// Mengelompokkan event webhook per target (key: `${projectId}:::${webhookUrl}:::${webhookSecret}`)
// Debounce window: 1000ms. Menghindari pemanggilan keluar terus-menerus saat ledakan pesan status terjadi.
const webhookBatcher = new DebouncedBatcher({
  windowMs: 1000,
  maxBatchSize: 25,
  handler: async (key, items) => {
    const [, webhookUrl, webhookSecret] = key.split(':::');
    await dispatchWebhookPayload({ webhookUrl, webhookSecret, events: items });
  }
});

/**
 * Memasukkan webhook event ke dalam pipeline debouncer.
 * Event tidak langsung menembak HTTP ke luar, melainkan di-debounce selama 1 detik
 * agar panggilan ke server eksternal terkendali dan tidak membombardir endpoint klien.
 *
 * @param {object} params
 * @param {string} params.projectId
 * @param {string} params.messageId
 * @param {string} params.status
 * @param {string|null} params.error
 * @param {string} params.webhookUrl
 * @param {string} params.webhookSecret
 */
export function queueDebouncedWebhook({ projectId, messageId, status, error, webhookUrl, webhookSecret }) {
  if (!webhookUrl) return;

  const key = `${projectId}:::${webhookUrl}:::${webhookSecret || 'default_secret'}`;
  const payload = {
    type: 'notification.status_update',
    created_at: new Date().toISOString(),
    data: {
      messageId,
      status,
      error: error || null
    }
  };

  webhookBatcher.add(key, { messageId, payload });
}

/**
 * Flush seluruh antrean webhook yang tertunda (berguna saat graceful shutdown).
 */
export async function flushPendingWebhooks() {
  await webhookBatcher.flushAll();
}
