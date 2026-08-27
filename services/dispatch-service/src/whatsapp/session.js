import { WHATSAPP_SESSION_STATUS, normalizeWhatsAppNumber } from '@notification-gateway/shared';
import { connectProject, getProjectSessionStatus } from './session-manager.js';

/**
 * Memastikan sesi WhatsApp satu project sudah terkoneksi sebelum mengirim pesan.
 * @param {string} projectId
 * @returns {Promise<import('@whiskeysockets/baileys').WASocket>}
 */
export async function ensureWhatsAppConnection(projectId) {
  return connectProject(projectId);
}

/**
 * Mengirim pesan teks WhatsApp via Baileys ke nomor tujuan memakai sesi milik project.
 * @param {{ projectId: string, recipient: string, body: string }} params
 * @returns {Promise<{ success: boolean, providerMessageId: string }>}
 */
export async function sendBaileysTextMessage({ projectId, recipient, body }) {
  const activeSocket = await ensureWhatsAppConnection(projectId);
  const { status } = getProjectSessionStatus(projectId);

  if (status !== WHATSAPP_SESSION_STATUS.CONNECTED) {
    throw new Error(`WhatsApp session project ${projectId} not ready (status: ${status}). Scan QR terlebih dahulu.`);
  }

  const jid = `${normalizeWhatsAppNumber(recipient)}@s.whatsapp.net`;
  const sentMessage = await activeSocket.sendMessage(jid, { text: body });

  return {
    success: true,
    providerMessageId: sentMessage?.key?.id || `baileys_${Date.now()}`
  };
}
