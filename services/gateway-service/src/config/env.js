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

import { buildBullMQConnection } from '@notification-gateway/shared';

// Konfigurasi lingkungan dan server gateway-service (BullMQ-safe, Upstash-ready)
export const config = {
  port: process.env.PORT || 3001,
  environment: process.env.NODE_ENV || 'development',
  redis: buildBullMQConnection()
};
