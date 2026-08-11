import { createLogger } from '@notification-gateway/shared';
import { config } from './config/env.js';
import { startWhatsAppWorker } from './whatsapp/worker.js';
import { startEmailWorker } from './email/worker.js';

const logger = createLogger('dispatch-service');

// Inisialisasi worker antrean WhatsApp dan Email
startWhatsAppWorker(config.redis);
startEmailWorker(config.redis);

logger.info('Dispatch Service started (WhatsApp & Email workers running)');
