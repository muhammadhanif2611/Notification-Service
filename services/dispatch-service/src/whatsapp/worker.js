import { Worker, Queue, UnrecoverableError } from 'bullmq';
import { createLogger, WHATSAPP_SESSION_STATUS } from '@notification-gateway/shared';
import { sendWhatsApp } from './sender.js';
import { getProjectSessionStatus } from './session-manager.js';
import { isNetworkOrSystemError } from './errors.js';

const logger = createLogger('dispatch-service');

// Worker: memproses pengiriman antrean whatsapp via Baileys (tidak butuh vendor credentials)
export function startWhatsAppWorker(redisConfig) {
  const statusQueue = new Queue('status-queue', { connection: redisConfig });

  /**
   * Melaporkan status FAILED final ke status-queue.
   * @param {object} job
   * @param {Error} error
   * @param {boolean} suppress — true bila nomor tujuan layak diblokir otomatis (salah nomor)
   */
  const reportFailed = (job, error, suppress) => {
    const { messageId, projectId, recipient } = job.data;
    return statusQueue.add('status-update', {
      messageId, projectId, status: 'FAILED', error: error.message, recipient, channel: 'WHATSAPP', suppress
    });
  };

  const worker = new Worker('whatsapp-queue', async (job) => {
    const { messageId, projectId, recipient, body, isSandbox } = job.data;
    logger.info({ messageId, recipient, body }, 'WhatsApp job processing');

    try {
      const sendResult = await sendWhatsApp({ projectId, recipient, body, isSandbox });
      await statusQueue.add('status-update', { messageId, projectId, status: 'SENT', recipient, channel: 'WHATSAPP' });
      return sendResult;
    } catch (error) {
      const attempt = job.attemptsMade + 1;
      const maxAttempts = job.opts?.attempts ?? 1;

      // 1) Salah nomor (format tidak valid / tidak terdaftar di WhatsApp): berhenti tanpa retry & blokir nomor.
      if (error.isHardBounce) {
        logger.error({ messageId, err: error.message, attempt }, 'WhatsApp hard bounce — recipient suppressed');
        await reportFailed(job, error, true);
        throw new UnrecoverableError(error.message);
      }

      // 2) Sesi butuh scan QR / reset: berhenti tanpa retry, nomor tujuan TIDAK diblokir.
      if (error.sessionNeedsAction) {
        logger.error({ messageId, projectId, err: error.message, attempt }, 'WhatsApp session needs action — not retrying');
        await reportFailed(job, error, false);
        throw new UnrecoverableError(error.message);
      }

      // 3) Gangguan sementara pada percobaan non-final: jangan lapor FAILED, biarkan BullMQ retry.
      if (attempt < maxAttempts) {
        logger.warn({ messageId, err: error.message, attempt, maxAttempts }, 'WhatsApp job failed — will retry');
        throw error;
      }

      // 4) Percobaan terakhir habis: blokir hanya bila sesi sehat dan error bukan masalah jaringan/sistem.
      const sessionHealthy = getProjectSessionStatus(projectId).status === WHATSAPP_SESSION_STATUS.CONNECTED;
      const suppress = sessionHealthy && !isNetworkOrSystemError(error);
      logger.error({ messageId, err: error.message, attempt, maxAttempts, sessionHealthy, suppress }, 'WhatsApp job failed on final attempt');
      await reportFailed(job, error, suppress);
      throw error;
    }
  }, {
    connection: redisConfig,
    concurrency: 5,
    // drainDelay: jeda (ms) sebelum worker polling ulang antrean saat kosong.
    // Default 5 dtk → 30 dtk agar request ke Upstash jauh lebih hemat.
    drainDelay: 30000,
    // stalledInterval: seberapa sering BullMQ memeriksa job yang macet.
    // Default 30 dtk → 5 mnt agar hemat request Upstash (cek ini memakai Lua tiap interval).
    stalledInterval: 300000,
    maxStalledCount: 2
  });

  worker.on('completed', (job) => logger.info({ messageId: job.data.messageId }, 'WhatsApp sent'));
  worker.on('failed', (job, error) => {
    const exhausted = error?.name === 'UnrecoverableError' || job.attemptsMade >= (job.opts?.attempts ?? 1);
    logger[exhausted ? 'error' : 'warn']({ messageId: job.data.messageId, err: error.message }, exhausted ? 'WhatsApp failed permanently' : 'WhatsApp attempt failed — retry scheduled');
  });
}
