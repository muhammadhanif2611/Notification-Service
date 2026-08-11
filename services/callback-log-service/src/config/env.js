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

// Konfigurasi lingkungan dan redis callback-log-service
export const config = {
  port: process.env.PORT || 3005,
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined
  }
};
