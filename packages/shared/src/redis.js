// =============================================================================
// Koneksi Redis terpusat — dipakai semua service (BullMQ, rate limiter, dll).
// Mendukung Upstash (REDIS_URL=rediss://...) maupun Redis lokal (REDIS_HOST/PORT).
//
// CATATAN PENTING BullMQ + Upstash:
// - maxRetriesPerRequest HARUS null agar command blocking (BRPOPLPUSH dll)
//   tidak dilempar error saat Upstash throttle / latency tinggi.
// - enableReadyCheck & lazyConnect diset agar koneksi TLS Upstash stabil.
// =============================================================================

/**
 * Membangun opsi koneksi Redis dari environment variable.
 * Prioritas: REDIS_URL (Upstash) > REDIS_HOST/REDIS_PORT (lokal).
 * @returns {{ host: string, port: number, password?: string, username?: string, tls?: object }}
 */
export function buildRedisConnection() {
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
      username: url.username || undefined,
      ...(url.protocol === 'rediss:' ? { tls: {} } : {})
    };
  }
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    ...(process.env.REDIS_TLS === 'true' ? { tls: {} } : {})
  };
}

/**
 * Opsi koneksi yang aman untuk BullMQ di atas Upstash.
 * maxRetriesPerRequest: null adalah WAJIB untuk BullMQ.
 * @returns {object} Opsi koneksi BullMQ-ready
 */
export function buildBullMQConnection() {
  return {
    ...buildRedisConnection(),
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  };
}
