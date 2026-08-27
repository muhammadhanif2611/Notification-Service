import { createLogger } from '@notification-gateway/shared';
import { sendBaileysTextMessage } from './session.js';

const logger = createLogger('dispatch-service');

/**
 * Mengirim pesan WhatsApp via Baileys (WhatsApp Web multi-device) memakai sesi milik project.
 * @param {{ projectId: string, recipient: string, body: string, isSandbox: boolean }} params
 * @returns {Promise<{ success: boolean, providerMessageId: string }>}
 */
export async function sendWhatsApp({ projectId, recipient, body, isSandbox }) {
  if (isSandbox) {
    logger.info({ projectId, recipient }, '[SANDBOX] WhatsApp simulated');
    return { success: true, providerMessageId: `baileys.sandbox.${Date.now()}` };
  }

  return sendBaileysTextMessage({ projectId, recipient, body });
}
