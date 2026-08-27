import { Queue } from 'bullmq';
import { config } from './env.js';

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  },
  // Batasi riwayat job agar tidak menumpuk di Redis (hemat memori & request pembersihan).
  // Job sukses: simpan max 100 terakhir ATAU 1 jam. Job gagal: max 500 terakhir ATAU 24 jam.
  removeOnComplete: { count: 100, age: 3600 },
  removeOnFail: { count: 500, age: 86400 }
};

/**
 * BullMQ Queue: WhatsApp Channel
 */
export const whatsappQueue = new Queue('whatsapp-queue', {
  connection: config.redis,
  defaultJobOptions
});

/**
 * BullMQ Queue: Email Channel
 */
export const emailQueue = new Queue('email-queue', {
  connection: config.redis,
  defaultJobOptions
});
