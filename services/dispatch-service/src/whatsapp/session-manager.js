import path from 'node:path';
import fs from 'node:fs';
import qrcode from 'qrcode-terminal';
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} from '@whiskeysockets/baileys';
import { createLogger, WHATSAPP_SESSION_STATUS } from '@notification-gateway/shared';

const logger = createLogger('dispatch-service');

// Konstanta reconnect exponential backoff
const RECONNECT_BASE_DELAY_MS = 5000;
const RECONNECT_MAX_DELAY_MS = 60000;

// Silent logger adapter untuk Baileys — hanya meneruskan error ke pino
const baileysLogger = ['trace', 'debug', 'info', 'warn'].reduce((acc, level) => {
  acc[level] = () => {};
  return acc;
}, {
  level: 'silent',
  error: (obj, msg) => logger.error({ baileys: obj }, msg || 'Baileys internal error'),
  child: () => baileysLogger
});

/**
 * Membuat state awal untuk satu sesi WhatsApp project.
 * @returns {{ socket: object|null, status: string, lastQrCode: string|null, connectionPromise: Promise|null, reconnectAttempts: number, connectedAt: string|null }}
 */
function createSessionState() {
  return {
    socket: null,
    status: WHATSAPP_SESSION_STATUS.DISCONNECTED,
    lastQrCode: null,
    connectionPromise: null,
    reconnectAttempts: 0,
    connectedAt: null
  };
}

// Registry seluruh sesi WhatsApp: Map<projectId, SessionState>
const sessions = new Map();

/**
 * Mengambil (atau membuat) state sesi untuk satu project.
 * @param {string} projectId
 * @returns {object} Session state
 */
function getOrCreateState(projectId) {
  if (!sessions.has(projectId)) {
    sessions.set(projectId, createSessionState());
  }
  return sessions.get(projectId);
}

/**
 * Mengambil folder auth state Baileys milik satu project.
 * @param {string} projectId
 * @returns {string} Absolute path folder sesi project
 */
function resolveProjectSessionPath(projectId) {
  const baseDir = path.resolve(process.env.WA_SESSION_PATH || './wa-sessions');
  const sessionDir = path.join(baseDir, String(projectId));
  fs.mkdirSync(sessionDir, { recursive: true });
  return sessionDir;
}

/**
 * Menghitung delay reconnect berikutnya dengan exponential backoff.
 * @param {number} attempts — Jumlah percobaan reconnect yang sudah dilakukan
 * @returns {number} Delay dalam milidetik
 */
function resolveReconnectDelay(attempts) {
  return Math.min(RECONNECT_BASE_DELAY_MS * 2 ** attempts, RECONNECT_MAX_DELAY_MS);
}

/**
 * Membangun koneksi socket Baileys baru untuk satu project.
 * @param {string} projectId
 * @returns {Promise<import('@whiskeysockets/baileys').WASocket>}
 */
async function connectSocket(projectId) {
  const state = getOrCreateState(projectId);
  const sessionPath = resolveProjectSessionPath(projectId);
  const { state: authState, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion();

  state.status = WHATSAPP_SESSION_STATUS.CONNECTING;

  state.socket = makeWASocket({
    version,
    auth: authState,
    logger: baileysLogger,
    printQRInTerminal: false,
    browser: ['Notification Gateway', 'Chrome', '1.0.0']
  });

  state.socket.ev.on('creds.update', saveCreds);
  state.socket.ev.on('connection.update', (update) => handleConnectionUpdate(projectId, update));

  return state.socket;
}

/**
 * Menjadwalkan reconnect dengan exponential backoff (5s → 10s → 20s → maks 60s).
 * @param {string} projectId
 * @returns {void}
 */
function scheduleReconnect(projectId) {
  const state = getOrCreateState(projectId);
  const delay = resolveReconnectDelay(state.reconnectAttempts);
  state.reconnectAttempts += 1;

  logger.warn({ projectId, delay, attempt: state.reconnectAttempts }, 'WhatsApp connection closed — scheduling reconnect');

  setTimeout(() => {
    connectSocket(projectId).catch((err) =>
      logger.error({ projectId, err: err.message }, 'WhatsApp reconnect failed')
    );
  }, delay);
}


/**
 * Handler event perubahan koneksi dari Baileys untuk satu project.
 * @param {string} projectId
 * @param {{ connection?: string, lastDisconnect?: { error?: { output?: { statusCode?: number } } }, qr?: string }} update
 * @returns {void}
 */
function handleConnectionUpdate(projectId, update) {
  const state = getOrCreateState(projectId);
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    state.status = WHATSAPP_SESSION_STATUS.WAITING_QR;
    state.lastQrCode = qr;
    logger.info({ projectId }, 'WhatsApp QR code generated — scan via WhatsApp > Linked Devices');
    qrcode.generate(qr, { small: true });
  }

  if (connection === 'open') {
    state.status = WHATSAPP_SESSION_STATUS.CONNECTED;
    state.lastQrCode = null;
    state.reconnectAttempts = 0;
    state.connectedAt = new Date().toISOString();
    logger.info({ projectId }, 'WhatsApp session connected');
  }

  if (connection === 'close') {
    state.status = WHATSAPP_SESSION_STATUS.DISCONNECTED;
    state.connectedAt = null;
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const isLoggedOut = statusCode === DisconnectReason.loggedOut;

    if (isLoggedOut) {
      logger.warn({ projectId }, 'WhatsApp session logged out — reset sesi dan scan ulang QR');
      state.socket = null;
      return;
    }

    scheduleReconnect(projectId);
  }
}

/**
 * Menghubungkan sesi WhatsApp untuk satu project (idempotent).
 * @param {string} projectId
 * @returns {Promise<import('@whiskeysockets/baileys').WASocket>}
 */
export async function connectProject(projectId) {
  const state = getOrCreateState(projectId);
  if (state.socket && state.status === WHATSAPP_SESSION_STATUS.CONNECTED) return state.socket;
  if (state.connectionPromise) return state.connectionPromise;
  state.connectionPromise = connectSocket(projectId).finally(() => { state.connectionPromise = null; });
  return state.connectionPromise;
}


/**
 * Memutuskan sesi WhatsApp satu project tanpa menghapus auth state (bisa connect ulang tanpa QR).
 * @param {string} projectId
 * @returns {Promise<{ success: boolean }>}
 */
export async function disconnectProject(projectId) {
  const state = getOrCreateState(projectId);

  try {
    state.socket?.end(undefined);
  } catch (err) {
    logger.warn({ projectId, err: err.message }, 'WhatsApp socket end failed (session may already be closed)');
  }

  state.socket = null;
  state.status = WHATSAPP_SESSION_STATUS.DISCONNECTED;
  state.lastQrCode = null;
  state.connectedAt = null;

  logger.info({ projectId }, 'WhatsApp session disconnected');
  return { success: true };
}

/**
 * Mengambil status sesi WhatsApp satu project.
 * @param {string} projectId
 * @returns {{ projectId: string, status: string, qr: string|null, connectedAt: string|null }}
 */
export function getProjectSessionStatus(projectId) {
  const state = sessions.get(projectId);
  return {
    projectId,
    status: state?.status || WHATSAPP_SESSION_STATUS.DISCONNECTED,
    qr: state?.lastQrCode || null,
    connectedAt: state?.connectedAt || null
  };
}

/**
 * Mengambil status seluruh sesi WhatsApp yang pernah terdaftar (untuk monitoring admin).
 * @returns {Array<{ projectId: string, status: string, qr: string|null, connectedAt: string|null }>}
 */
export function getAllSessionStatuses() {
  return [...sessions.keys()].map((projectId) => getProjectSessionStatus(projectId));
}

/**
 * Logout dan reset sesi WhatsApp satu project — auth state dihapus, QR baru digenerate.
 * @param {string} projectId
 * @returns {Promise<{ success: boolean }>}
 */
export async function resetProjectSession(projectId) {
  const state = getOrCreateState(projectId);

  try {
    await state.socket?.logout();
  } catch (err) {
    logger.warn({ projectId, err: err.message }, 'WhatsApp logout failed (session may already be closed)');
  }

  state.socket = null;
  state.status = WHATSAPP_SESSION_STATUS.DISCONNECTED;
  state.lastQrCode = null;
  state.connectedAt = null;
  state.reconnectAttempts = 0;

  fs.rmSync(resolveProjectSessionPath(projectId), { recursive: true, force: true });

  logger.info({ projectId }, 'WhatsApp session reset — generating new QR');
  await connectProject(projectId);
  return { success: true };
}

