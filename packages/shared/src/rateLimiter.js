import { Redis } from 'ioredis';
import { buildRedisConnection } from './redis.js';

let sharedRedisClient = null;

/**
 * Mendapatkan (atau membuat) koneksi Redis bersama untuk rate limiter.
 * @param {object} [redisConfig] - Override { host, port, password, tls } opsional
 * @returns {Redis} Instance ioredis
 */
function getRedisClient(redisConfig = {}) {
  if (!sharedRedisClient) {
    const connectionOpts = Object.keys(redisConfig).length > 0
      ? redisConfig
      : buildRedisConnection();

    sharedRedisClient = new Redis({
      ...connectionOpts,
      lazyConnect: false,
      maxRetriesPerRequest: 2
    });
  }
  return sharedRedisClient;
}

/**
 * Mengecek apakah sebuah key masih berada di bawah batas rate limit (Sliding Window Log).
 * Menggunakan Redis Sorted Set. Setiap request dicatat sebagai member dengan skor timestamp (ms).
 * Jendela geser menghapus entri yang lebih tua dari `windowMs`.
 *
 * @param {object} options
 * @param {string} options.key - Identifier unik (mis. `ratelimit:project:<projectId>`)
 * @param {number} options.limit - Maksimum request yang diizinkan dalam jendela
 * @param {number} [options.windowMs=60000] - Ukuran jendela waktu dalam milidetik (default 1 menit)
 * @param {object} [options.redisConfig] - Konfigurasi Redis opsional
 * @returns {Promise<{allowed: boolean, remaining: number, retryAfterMs: number}>}
 */
export async function checkRateLimit({ key, limit, windowMs = 60000, redisConfig } = {}) {
  const redis = getRedisClient(redisConfig);
  const now = Date.now();
  const windowStart = now - windowMs;
  const member = `${now}:${Math.random().toString(36).slice(2, 10)}`;

  const pipeline = redis.multi();
  pipeline.zremrangebyscore(key, 0, windowStart); // buang entri kedaluwarsa
  pipeline.zcard(key); // hitung request aktif
  pipeline.zadd(key, now, member); // catat request ini
  pipeline.pexpire(key, windowMs); // TTL agar key tidak menumpuk

  const results = await pipeline.exec();
  const currentCount = results?.[1]?.[1] ?? 0; // hasil zcard SEBELUM zadd

  if (currentCount >= limit) {
    // Request melebihi limit: batalkan pencatatan zadd agar tidak dihitung
    await redis.zrem(key, member);
    const oldest = await redis.zrange(key, 0, 0, 'WITHSCORES');
    const oldestScore = oldest?.[1] ? parseInt(oldest[1], 10) : now;
    const retryAfterMs = Math.max(0, oldestScore + windowMs - now);
    return { allowed: false, remaining: 0, retryAfterMs };
  }

  return { allowed: true, remaining: Math.max(0, limit - (currentCount + 1)), retryAfterMs: 0 };
}
