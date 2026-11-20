import { normalizeWhatsAppNumber } from '@notification-gateway/shared';
import { ensureConnected } from './session-manager.js';
import { createFlaggedError } from './errors.js';

// Nomor internasional (E.164) valid: 9–15 digit angka.
const WHATSAPP_NUMBER_PATTERN = /^\d{9,15}$/;

/**
 * Memastikan sesi WhatsApp satu project sudah terkoneksi (status CONNECTED) sebelum mengirim pesan.
 * @param {string} projectId
 * @returns {Promise<import('@whiskeysockets/baileys').WASocket>}
 */
export async function ensureWhatsAppConnection(projectId) {
  return ensureConnected(projectId);
}

/**
 * Mengirim pesan teks WhatsApp via Baileys ke nomor tujuan memakai sesi milik project.
 * Error "salah nomor" (format tidak valid / tidak terdaftar di WhatsApp) diberi penanda isHardBounce = true.
 * @param {{ projectId: string, recipient: string, body: string }} params
 * @returns {Promise<{ success: boolean, providerMessageId: string }>}
 */
export async function sendBaileysTextMessage({ projectId, recipient, body }) {
  const normalizedNumber = normalizeWhatsAppNumber(recipient);
  if (!WHATSAPP_NUMBER_PATTERN.test(normalizedNumber)) {
    throw createFlaggedError(`Invalid WhatsApp number format: '${recipient}' (harus 9–15 digit angka)`, { isHardBounce: true });
  }

  const activeSocket = await ensureWhatsAppConnection(projectId);

  const jid = `${normalizedNumber}@s.whatsapp.net`;
  const [lookup] = (await activeSocket.onWhatsApp(jid)) || [];
  if (!lookup?.exists) {
    throw createFlaggedError(`Nomor ${normalizedNumber} tidak terdaftar di WhatsApp`, { isHardBounce: true });
  }

  const sentMessage = await activeSocket.sendMessage(lookup.jid || jid, { text: body });

  return {
    success: true,
    providerMessageId: sentMessage?.key?.id || `baileys_${Date.now()}`
  };
}
