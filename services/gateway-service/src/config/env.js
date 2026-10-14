import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const findEnv = (filename = '.env') => {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (dir !== path.parse(dir).root) {
    const envPath = path.join(dir, filename);
    if (fs.existsSync(envPath)) return envPath;
    dir = path.dirname(dir);
  }
  return null;
};

// 1. Muat .env sebagai base
const baseEnv = findEnv('.env');
if (baseEnv) dotenv.config({ path: baseEnv });

// 2. Muat .env.local untuk override lokal jika ada
const localEnv = findEnv('.env.local');
if (localEnv) dotenv.config({ path: localEnv, override: true });

import { buildBullMQConnection } from '@notification-gateway/shared';

// Konfigurasi lingkungan dan server gateway-service (BullMQ-safe, Upstash-ready)
export const config = {
  port: process.env.PORT || 3001,
  environment: process.env.NODE_ENV || 'development',
  corsOrigins: process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',').map((s) => s.trim())
    : [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:8080',
        'http://127.0.0.1:8080'
      ],
  redis: buildBullMQConnection()
};
