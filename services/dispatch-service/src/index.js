import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createLogger } from '@notification-gateway/shared';
import { startWhatsAppWorker } from './whatsapp/worker.js';
import { startEmailWorker } from './email/worker.js';

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

const logger = createLogger('dispatch-service');

const redisConfig = {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined
};

startWhatsAppWorker(redisConfig);
startEmailWorker(redisConfig);

logger.info('Dispatch Service started (WhatsApp & Email workers running)');
