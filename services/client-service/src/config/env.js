import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const findEnv = (filename = '.env') => {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (dir !== path.parse(dir).root) {
    const envPath = path.join(dir, filename);
    if (fs.existsSync(envPath)) {
      return envPath;
    }
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

export const config = {
  port: process.env.PORT || 3003,
  environment: process.env.NODE_ENV || 'development'
};
