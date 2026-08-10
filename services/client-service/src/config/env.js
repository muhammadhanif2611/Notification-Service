import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const findEnv = () => {
  let dir = path.dirname(fileURLToPath(import.meta.url));
  while (dir !== path.parse(dir).root) {
    const envPath = path.join(dir, '.env');
    if (fs.existsSync(envPath)) {
      return envPath;
    }
    dir = path.dirname(dir);
  }
  return null;
};

dotenv.config({ path: findEnv() });

export const config = {
  port: process.env.PORT || 3003,
  environment: process.env.NODE_ENV || 'development'
};
