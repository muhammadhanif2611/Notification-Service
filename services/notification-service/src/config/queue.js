import { Queue } from 'bullmq';
import { config } from './env.js';

const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000
  },
  removeOnComplete: { count: 500 },
  removeOnFail: { count: 1000 }
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
