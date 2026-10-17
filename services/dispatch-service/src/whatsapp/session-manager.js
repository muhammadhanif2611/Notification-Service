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
    credentialsPromise: Promise.resolve(),
    reconnectAttempts: 0,
    reconnectTimer: null,
    generation: 0,
    lastError: null,
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
  const sessionDir = path.resolve(baseDir, String(projectId));
  if (path.dirname(sessionDir) !== baseDir) {
    throw new Error('Invalid WhatsApp project session path');
  }
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
  const generation = state.generation;
  state.status = WHATSAPP_SESSION_STATUS.CONNECTING;
  state.lastQrCode = null;
  state.lastError = null;
  await state.credentialsPromise;
  if (state.generation !== generation) return null;
  const sessionPath = resolveProjectSessionPath(projectId);
  const { state: authState, saveCreds } = await useMultiFileAuthState(sessionPath);
  const { version } = await fetchLatestBaileysVersion({ timeout: 5000 });
  if (state.generation !== generation) return null;

  state.socket = makeWASocket({
    version,
    auth: authState,
    logger: baileysLogger,
    printQRInTerminal: false,
    browser: ['Notification Gateway', 'Chrome', '1.0.0']
  });

  const socket = state.socket;
  socket.ev.on('creds.update', () => {
    if (state.socket !== socket) return;
    state.credentialsPromise = state.credentialsPromise.then(() => {
      if (state.generation === generation) return saveCreds();
    }).catch((err) => {
      if (state.generation === generation) {
        state.lastError = 'Gagal menyimpan sesi WhatsApp. Periksa penyimpanan service.';
      }
      logger.error({ projectId, err: err.message }, 'WhatsApp credentials could not be saved');
    });
  });
  socket.ev.on('connection.update', (update) => {
    if (state.socket === socket) handleConnectionUpdate(projectId, update);
  });

  return state.socket;
}

/**
 * Menjadwalkan reconnect dengan exponential backoff (5s → 10s → 20s → maks 60s).
 * @param {string} projectId
 * @returns {void}
 */
function scheduleReconnect(projectId) {
  const state = getOrCreateState(projectId);
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }
  const delay = resolveReconnectDelay(state.reconnectAttempts);
  state.reconnectAttempts += 1;
  state.status = WHATSAPP_SESSION_STATUS.CONNECTING;

  logger.warn({ projectId, delay, attempt: state.reconnectAttempts }, 'WhatsApp connection closed — scheduling debounced reconnect');

  state.reconnectTimer = setTimeout(() => {
    state.reconnectTimer = null;
    const generation = state.generation;
    connectProject(projectId).catch((err) => {
      logger.error({ projectId, err: err.message }, 'WhatsApp reconnect failed');
      if (state.generation === generation) scheduleReconnect(projectId);
    });
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
    state.lastError = null;
    logger.info({ projectId }, 'WhatsApp session connected');
  }

  if (connection === 'close') {
    state.status = WHATSAPP_SESSION_STATUS.DISCONNECTED;
    state.socket = null;
    state.lastQrCode = null;
    state.connectedAt = null;
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const requiresAction = [
      DisconnectReason.loggedOut,
      DisconnectReason.badSession,
      DisconnectReason.connectionReplaced,
      DisconnectReason.multideviceMismatch,
      DisconnectReason.forbidden,
    ].includes(statusCode);

    if (requiresAction) {
      state.lastError = statusCode === DisconnectReason.connectionReplaced
        ? 'Sesi dipakai oleh koneksi lain. Pastikan hanya satu service yang memakai sesi ini.'
        : 'Sesi WhatsApp perlu ditautkan ulang. Klik Reset Sesi lalu scan QR baru.';
      logger.warn({ projectId, statusCode }, 'WhatsApp session needs attention');
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
  if (state.socket) return state.socket;
  if (state.connectionPromise) return state.connectionPromise;
  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }
  const generation = state.generation;
  const promise = connectSocket(projectId).catch((err) => {
    if (state.generation === generation) {
      state.status = WHATSAPP_SESSION_STATUS.DISCONNECTED;
      state.lastError = err.code === 'EACCES'
        ? 'Penyimpanan sesi WhatsApp tidak dapat ditulis. Periksa izin volume service.'
        : 'Gagal memulai koneksi WhatsApp. Coba Hubungkan kembali.';
    }
    throw err;
  }).finally(() => {
    if (state.connectionPromise === promise) state.connectionPromise = null;
  });
  state.connectionPromise = promise;
  return state.connectionPromise;
}


/**
 * Memutuskan sesi WhatsApp satu project tanpa menghapus auth state (bisa connect ulang tanpa QR).
 * @param {string} projectId
 * @returns {Promise<{ success: boolean }>}
 */
export async function disconnectProject(projectId) {
  const state = getOrCreateState(projectId);
  const socket = state.socket;
  state.generation += 1;
  state.socket = null;
  state.connectionPromise = null;

  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }

  try {
    socket?.end(undefined);
  } catch (err) {
    logger.warn({ projectId, err: err.message }, 'WhatsApp socket end failed (session may already be closed)');
  }

  state.socket = null;
  state.status = WHATSAPP_SESSION_STATUS.DISCONNECTED;
  state.lastQrCode = null;
  state.connectedAt = null;
  state.lastError = null;

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
    connectedAt: state?.connectedAt || null,
    lastError: state?.lastError || null
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
  const socket = state.socket;
  const pendingConnection = state.connectionPromise;
  state.generation += 1;
  state.socket = null;
  state.connectionPromise = null;

  if (state.reconnectTimer) {
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = null;
  }

  try {
    await socket?.logout();
  } catch (err) {
    logger.warn({ projectId, err: err.message }, 'WhatsApp logout failed (session may already be closed)');
  }

  state.socket = null;
  state.status = WHATSAPP_SESSION_STATUS.DISCONNECTED;
  state.lastQrCode = null;
  state.connectedAt = null;
  state.reconnectAttempts = 0;
  state.lastError = null;

  // Wait until an older setup stops writing before removing its auth directory.
  await pendingConnection?.catch(() => {});
  await state.credentialsPromise;

  fs.rmSync(resolveProjectSessionPath(projectId), { recursive: true, force: true });

  logger.info({ projectId }, 'WhatsApp session reset — generating new QR');
  await connectProject(projectId);
  return { success: true };
}

// Restore only previously paired sessions; unpaired projects still connect on demand.
export async function restoreProjectSessions() {
  const baseDir = path.resolve(process.env.WA_SESSION_PATH || './wa-sessions');
  let entries;
  try {
    entries = await fs.promises.readdir(baseDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === 'ENOENT') return;
    throw err;
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(entry.name)) continue;
    try {
      const credentials = JSON.parse(await fs.promises.readFile(path.join(baseDir, entry.name, 'creds.json'), 'utf8'));
      if (!credentials.registered) continue;
    } catch (err) {
      logger.warn({ projectId: entry.name, err: err.message }, 'Could not read saved WhatsApp session');
      continue;
    }
    try {
      await connectProject(entry.name);
      logger.info({ projectId: entry.name }, 'Restoring saved WhatsApp connection');
    } catch (err) {
      logger.error({ projectId: entry.name, err: err.message }, 'Could not restore WhatsApp connection');
      scheduleReconnect(entry.name);
    }
  }
}

