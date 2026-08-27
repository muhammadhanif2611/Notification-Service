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
 * Mengecek apakah sebuah key masih berada di bawah batas rate limit (Fixed Window Counter).
 * Menggunakan Redis INCRBY. Setiap panggil memesan `count` slot pada window aktif;
 * key kedaluwarsa otomatis via TTL sehingga tidak menumpuk di Redis.
 *
 * @param {object} options
 * @param {string} options.key - Identifier unik (mis. `ratelimit:project:<projectId>`)
 * @param {number} options.limit - Maksimum pesan yang diizinkan dalam jendela (diatur admin via rate_limit_per_min)
 * @param {number} [options.windowMs=60000] - Ukuran jendela waktu dalam milidetik (default 1 menit)
 * @param {number} [options.count=1] - Jumlah slot yang dipesan (1 untuk single send, N untuk broadcast)
 * @param {object} [options.redisConfig] - Konfigurasi Redis opsional
 * @returns {Promise<{allowed: boolean, remaining: number, retryAfterMs: number}>}
 */
export async function checkRateLimit({ key, limit, windowMs = 60000, count = 1, redisConfig } = {}) {
  const redis = getRedisClient(redisConfig);
  const now = Date.now();
  // Fixed-window counter: INCRBY sebesar `count` per panggil (TTL diset hanya saat window baru).
  // Jauh lebih hemat request Upstash dibanding sliding-window log (4 command/request).
  // Trade-off: batas bisa terlampaui hingga 2x tepat di perbatasan dua window —
  // dapat diterima untuk rate limiting API umum.
  const windowId = Math.floor(now / windowMs);
  const windowKey = `${key}:${windowId}`;

  // INCRBY mengembalikan total SETELAH penambahan; dipakai untuk single send (count=1)
  // sekaligus broadcast (count=N) agar N recipient memesan N slot dalam satu call.
  const newTotal = await redis.incrby(windowKey, count);
  if (newTotal === count) {
    // Window baru — pasang TTL agar key otomatis terhapus setelah windowMs
    await redis.pexpire(windowKey, windowMs);
  }

  const priorCount = newTotal - count; // pemakaian SEBELUM request ini

  if (newTotal > limit) {
    // Melebihi batas — batalkan penambahan agar window tidak "bocor" oleh request yang ditolak
    await redis.decrby(windowKey, count);
    const retryAfterMs = Math.max(0, (windowId + 1) * windowMs - now);
    return { allowed: false, remaining: Math.max(0, limit - priorCount), retryAfterMs };
  }

  return { allowed: true, remaining: Math.max(0, limit - newTotal), retryAfterMs: 0 };
}
