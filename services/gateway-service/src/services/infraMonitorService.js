import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { createLogger } from '@notification-gateway/shared';

const logger = createLogger('gateway-service:infra-monitor');

const HEALTH_TIMEOUT_MS = 3000;
const QUEUE_NAMES = ['email-queue', 'whatsapp-queue', 'status-queue'];
const startedAt = Date.now();

async function pingService(baseUrl) {
  const started = Date.now();
  try {
    const response = await fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
    return { status: response.ok ? 'healthy' : 'degraded', latency_ms: Date.now() - started };
  } catch {
    return { status: 'down', latency_ms: null };
  }
}

function formatUptime(ms) {
  const seconds = Math.floor(ms / 1000);
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return hours > 0 ? `${hours}j ${minutes}m` : `${minutes}m ${seconds % 60}d`;
}

// Kesehatan live seluruh node cluster: microservice HTTP + Redis worker pool
export async function getClusterHealth(services, config) {
  const serviceEntries = Object.entries(services);
  const results = await Promise.all(serviceEntries.map(async ([key, url]) => [key, await pingService(url)]));
  const serviceMap = Object.fromEntries(results);

  let redisNode = { status: 'down', latency_ms: null };
  const redis = new Redis({ ...config.redis, lazyConnect: true, connectTimeout: HEALTH_TIMEOUT_MS });
  try {
    const started = Date.now();
    await redis.connect();
    await redis.ping();
    redisNode = { status: 'healthy', latency_ms: Date.now() - started };
  } catch (err) {
    logger.warn({ err: err.message }, 'Redis health check failed');
  } finally {
    redis.disconnect();
  }

  return {
    gateway: { status: 'healthy', latency_ms: 0, uptime: formatUptime(Date.now() - startedAt) },
    services: serviceMap,
    redis: redisNode
  };
}

// Metrik antrean BullMQ live: jumlah job per state + proses memori gateway
export async function getQueueMetrics(config) {
  const queues = QUEUE_NAMES.map((name) => new Queue(name, { connection: config.redis }));
  try {
    const countsPerQueue = await Promise.all(queues.map((queue) => queue.getJobCounts(
      'waiting', 'active', 'completed', 'failed', 'delayed', 'paused'
    )));

    const totals = { waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0, paused: 0 };
    for (const counts of countsPerQueue) {
      for (const key of Object.keys(totals)) totals[key] += counts[key] || 0;
    }

    const memoryUsage = process.memoryUsage();
    return {
      waiting: totals.waiting,
      active: totals.active,
      failed: totals.failed,
      delayed: totals.delayed,
      dead_letter: totals.failed,
      queue_memory_mb: Math.round(memoryUsage.rss / (1024 * 1024)),
      uptime_seconds: Math.floor((Date.now() - startedAt) / 1000)
    };
  } finally {
    await Promise.all(queues.map((queue) => queue.close()));
  }
}
