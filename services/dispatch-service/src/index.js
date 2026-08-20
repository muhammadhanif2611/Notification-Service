import { createLogger } from '@notification-gateway/shared';
import { config } from './config/env.js';
import { startWhatsAppWorker } from './whatsapp/worker.js';
import { startEmailWorker } from './email/worker.js';
import { ensureWhatsAppConnection } from './whatsapp/session.js';

const logger = createLogger('dispatch-service');

// Inisialisasi worker antrean WhatsApp dan Email
startWhatsAppWorker(config.redis);
startEmailWorker(config.redis);

// Koneksi sesi WhatsApp (Baileys) diinisiasi saat startup — QR muncul di log jika belum pairing
ensureWhatsAppConnection().catch((err) => {
  logger.error({ err: err.message }, 'Failed to initialize WhatsApp session');
});

logger.info('Dispatch Service started (WhatsApp Baileys & Email Nodemailer workers running)');
