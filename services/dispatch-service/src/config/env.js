import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const findEnv = () => {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (dir !== path.parse(dir).root) {
    const envPath = path.join(dir, '.env');
    if (fs.existsSync(envPath)) return envPath;
    dir = path.dirname(dir);
  }
  return null;
};

dotenv.config({ path: findEnv() });

/**
 * Membangun konfigurasi koneksi Redis.
 * - Jika REDIS_URL diset (format Upstash: rediss://default:<pw>@host:port),
 *   URL akan di-parse otomatis termasuk TLS.
 * - Jika tidak, gunakan REDIS_HOST / REDIS_PORT / REDIS_PASSWORD / REDIS_TLS.
 */
function buildRedisConfig() {
  if (process.env.REDIS_URL) {
    const url = new URL(process.env.REDIS_URL);
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379', 10),
      password: url.password || undefined,
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

// Konfigurasi lingkungan dan redis dispatch-service
export const config = {
  redis: buildRedisConfig()
};
