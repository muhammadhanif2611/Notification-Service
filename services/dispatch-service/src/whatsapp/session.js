import path from 'node:path';
import fs from 'node:fs';
import qrcode from 'qrcode-terminal';
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys';
import { createLogger, WHATSAPP_SESSION_STATUS, normalizeWhatsAppNumber } from '@notification-gateway/shared';

const logger = createLogger('dispatch-service');

// Silent logger adapter untuk Baileys — hanya meneruskan error ke pino
const baileysLogger = ['trace', 'debug', 'info', 'warn'].reduce((acc, level) => {
  acc[level] = () => {};
  return acc;
}, {
  level: 'silent',
  error: (obj, msg) => logger.error({ baileys: obj }, msg || 'Baileys internal error'),
  child: () => baileysLogger
});

// State sesi WhatsApp di memori (single worker process)
let socket = null;
let sessionStatus = WHATSAPP_SESSION_STATUS.DISCONNECTED;
let lastQrCode = null;
let connectionPromise = null;

/**
 * Mengambil path penyimpanan file auth state Baileys.
 * @returns {string} Absolute path folder sesi
 */
function resolveSessionPath() {
  const sessionDir = path.resolve(process.env.WA_SESSION_PATH || './wa-sessions');
  fs.mkdirSync(sessionDir, { recursive: true });
  return sessionDir;
}

/**
 * Memastikan sesi WhatsApp sudah terkoneksi sebelum mengirim pesan.
 * @returns {Promise<import('@whiskeysockets/baileys').WASocket>}
 */
export async function ensureWhatsAppConnection() {
  if (socket && sessionStatus === WHATSAPP_SESSION_STATUS.CONNECTED) return socket;
  if (connectionPromise) return connectionPromise;
  connectionPromise = connectToWhatsApp().finally(() => { connectionPromise = null; });
  return connectionPromise;
}

/**
 * Membangun koneksi socket Baileys dengan auth state multi-file.
 * @returns {Promise<import('@whiskeysockets/baileys').WASocket>}
 */
async function connectToWhatsApp() {
  const sessionPath = resolveSessionPath();
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  sessionStatus = WHATSAPP_SESSION_STATUS.CONNECTING;

  socket = makeWASocket({
    version,
    auth: state,
    logger: baileysLogger,
    printQRInTerminal: false,
    browser: ['Notification Gateway', 'Chrome', '1.0.0']
  });

  socket.ev.on('creds.update', saveCreds);
  socket.ev.on('connection.update', handleConnectionUpdate);

  return socket;
}

/**
 * Handler event perubahan koneksi dari Baileys.
 * @param {{ connection?: string, lastDisconnect?: { error?: { output?: { statusCode?: number } } }, qr?: string }} update
 * @returns {void}
 */
function handleConnectionUpdate(update) {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    sessionStatus = WHATSAPP_SESSION_STATUS.WAITING_QR;
    lastQrCode = qr;
    logger.info('WhatsApp QR code generated — scan via WhatsApp > Linked Devices, atau GET /clients/wa-session/qr');
    qrcode.generate(qr, { small: true });
  }

  if (connection === 'open') {
    sessionStatus = WHATSAPP_SESSION_STATUS.CONNECTED;
    lastQrCode = null;
    logger.info('WhatsApp session connected');
  }

  if (connection === 'close') {
    sessionStatus = WHATSAPP_SESSION_STATUS.DISCONNECTED;
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const isLoggedOut = statusCode === DisconnectReason.loggedOut;

    if (isLoggedOut) {
      logger.warn('WhatsApp session logged out — hapus folder sesi dan scan ulang QR');
      socket = null;
      return;
    }

    logger.warn({ statusCode }, 'WhatsApp connection closed — reconnecting in 5s');
    setTimeout(() => {
      connectToWhatsApp().catch((err) => logger.error({ err: err.message }, 'WhatsApp reconnect failed'));
    }, 5000);
  }
}

/**
 * Mengambil status sesi WhatsApp saat ini.
 * @returns {{ status: string, qr: string|null }}
 */
export function getWhatsAppSessionStatus() {
  return { status: sessionStatus, qr: lastQrCode };
}

/**
 * Logout dan reset sesi WhatsApp (file auth state dihapus).
 * @returns {Promise<{ success: boolean }>}
 */
export async function resetWhatsAppSession() {
  try {
    await socket?.logout();
  } catch (err) {
    logger.warn({ err: err.message }, 'WhatsApp logout failed (session may already be closed)');
  }

  socket = null;
  sessionStatus = WHATSAPP_SESSION_STATUS.DISCONNECTED;
  lastQrCode = null;
  fs.rmSync(resolveSessionPath(), { recursive: true, force: true });

  connectionPromise = connectToWhatsApp().finally(() => { connectionPromise = null; });
  await connectionPromise;
  return { success: true };
}

/**
 * Mengirim pesan teks WhatsApp via Baileys ke nomor tujuan.
 * @param {{ recipient: string, body: string }} params
 * @returns {Promise<{ success: boolean, providerMessageId: string }>}
 */
export async function sendBaileysTextMessage({ recipient, body }) {
  const activeSocket = await ensureWhatsAppConnection();

  if (sessionStatus !== WHATSAPP_SESSION_STATUS.CONNECTED) {
    throw new Error(`WhatsApp session not ready (status: ${sessionStatus}). Scan QR terlebih dahulu.`);
  }

  const jid = `${normalizeWhatsAppNumber(recipient)}@s.whatsapp.net`;
  const sentMessage = await activeSocket.sendMessage(jid, { text: body });

  return {
    success: true,
    providerMessageId: sentMessage?.key?.id || `baileys_${Date.now()}`
  };
}

// Named export agar modul bisa diimpor lintas workspace (mis. client-service untuk manajemen sesi)
export const whatsappSession = {
  getStatus: getWhatsAppSessionStatus,
  reset: resetWhatsAppSession
};
