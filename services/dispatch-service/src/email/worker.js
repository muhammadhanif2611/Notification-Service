import { Worker, Queue, UnrecoverableError } from 'bullmq';
import { createLogger, decryptAES } from '@notification-gateway/shared';
import { sendEmail } from './sender.js';
import * as dispatchRepository from '../repositories/dispatchRepository.js';

const logger = createLogger('dispatch-service');

// Helper: dekripsi credentials vendor jika tersedia, null jika sandbox.
// Kegagalan dekripsi/parse ditandai isVendorConfigError (kesalahan sistem, bukan alamat penerima).
function resolveVendorCredentials(vendorRecord) {
  if (!vendorRecord?.credential_encrypted) return null;
  try {
    return JSON.parse(decryptAES({
      encryptedData: vendorRecord.credential_encrypted,
      iv: vendorRecord.credential_iv,
      authTag: vendorRecord.credential_auth_tag
    }));
  } catch (err) {
    throw Object.assign(new Error(`Vendor credentials could not be decrypted: ${err.message}`), { isVendorConfigError: true });
  }
}

// Pola penolakan SMTP permanen karena alamat penerima salah / tidak ada.
const RECIPIENT_REJECTED_PATTERN = /user unknown|unknown user|no such user|invalid (?:e-?mail )?address|invalid recipient|address rejected|mailbox (?:unavailable|not found|does not exist)|recipient (?:address )?rejected|does not exist|unrouteable address/i;
// Penolakan 550 karena kebijakan/relay/spam adalah masalah pengirim, bukan alamat penerima.
const POLICY_REJECTION_PATTERN = /\b5\.7\.\d+\b|relay|spam|blocked|blacklist|policy|denied|authentication/i;

/**
 * Menentukan apakah error SMTP berarti alamat email penerima salah (hard bounce).
 * @param {any} error
 * @returns {boolean}
 */
function isInvalidRecipientError(error) {
  const response = String(error?.response || '');
  const message = String(error?.message || '');
  const text = `${response} ${message}`;
  if (POLICY_REJECTION_PATTERN.test(text)) return false;
  if (/\b5\.1\.[123]\b/.test(text)) return true;
  if (RECIPIENT_REJECTED_PATTERN.test(text)) return true;
  return error?.code === 'EENVELOPE' || [550, 551, 553].includes(error?.responseCode);
}

// Cache vendor credentials di memori — vendor jarang berubah, hindari query DB per job
const VENDOR_CACHE_TTL_MS = 60000;
const vendorCache = new Map();

/**
 * Mengambil vendor aktif per channel dengan cache TTL 60 detik.
 * @param {string} channel
 * @returns {Promise<object|null>}
 */
async function findCachedVendor(channel) {
  const cached = vendorCache.get(channel);
  if (cached && Date.now() - cached.fetchedAt < VENDOR_CACHE_TTL_MS) {
    return cached.record;
  }
  const record = await dispatchRepository.findActiveVendorByChannel(channel);
  vendorCache.set(channel, { record, fetchedAt: Date.now() });
  return record;
}

// Worker: memproses pengiriman antrean email
export function startEmailWorker(redisConfig) {
  const statusQueue = new Queue('status-queue', { connection: redisConfig });

  const worker = new Worker('email-queue', async (job) => {
    const { messageId, projectId, recipient, subject, body, isSandbox } = job.data;
    logger.info({ messageId, recipient }, 'Email job processing');

    // Seluruh proses (termasuk dekripsi credentials) di dalam try agar kegagalan
    // apa pun tercatat ke status-queue — sebelumnya error dekripsi AES di luar try
    // membuat job gagal diam-diam tanpa update status ke database.
    let vendorRecord = null;
    try {
      vendorRecord = await findCachedVendor('EMAIL');
      const credentials = resolveVendorCredentials(vendorRecord);

      const sendResult = await sendEmail({ recipient, subject, body, credentials, isSandbox });
      await statusQueue.add('status-update', { messageId, projectId, status: 'SENT', vendorId: vendorRecord?.id, recipient, channel: 'EMAIL' });
      return sendResult;
    } catch (error) {
      const attempt = job.attemptsMade + 1;
      const maxAttempts = job.opts?.attempts ?? 1;
      const reportFailed = (suppress) => statusQueue.add('status-update', {
        messageId, projectId, status: 'FAILED', error: error.message, recipient, channel: 'EMAIL', suppress
      });

      // 1) Salah alamat email (550 / 5.1.1 / user unknown / invalid address): berhenti tanpa retry & blokir.
      if (!error.isVendorConfigError && isInvalidRecipientError(error)) {
        logger.error({ messageId, err: error.message, attempt }, 'Email hard bounce — recipient suppressed');
        await reportFailed(true);
        throw new UnrecoverableError(error.message);
      }

      // 2) Konfigurasi vendor bermasalah (tidak ada vendor aktif / dekripsi gagal): kesalahan sistem, tanpa retry.
      if (error.isVendorConfigError) {
        logger.error({ messageId, err: error.message, attempt }, 'Email vendor configuration error — not retrying');
        await reportFailed(false);
        throw new UnrecoverableError(error.message);
      }

      // 3) Koneksi SMTP / timeout / gangguan sementara: jangan lapor FAILED sebelum retry habis.
      if (attempt < maxAttempts) {
        logger.warn({ messageId, err: error.message, attempt, maxAttempts }, 'Email job failed — will retry');
        throw error;
      }

      // 4) Retry terakhir habis: lapor FAILED tanpa memblokir penerima.
      logger.error({ messageId, err: error.message, attempt, maxAttempts }, 'Email job failed on final attempt');
      await reportFailed(false);
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

  worker.on('completed', (job) => logger.info({ messageId: job.data.messageId }, 'Email sent'));
  worker.on('failed', (job, error) => {
    const exhausted = error?.name === 'UnrecoverableError' || job.attemptsMade >= (job.opts?.attempts ?? 1);
    logger[exhausted ? 'error' : 'warn']({ messageId: job.data.messageId, err: error.message }, exhausted ? 'Email failed permanently' : 'Email attempt failed — retry scheduled');
  });
}
