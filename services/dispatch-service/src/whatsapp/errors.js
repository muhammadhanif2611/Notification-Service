// Penanda error pengiriman WhatsApp — memisahkan "salah nomor" dari "salah sistem".

// Kode error Node.js yang menandakan gangguan jaringan/sistem (bukan kesalahan nomor tujuan).
const NETWORK_ERROR_CODES = new Set([
  'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ECONNABORTED', 'ENOTFOUND', 'EAI_AGAIN', 'EPIPE', 'EHOSTUNREACH', 'ENETUNREACH'
]);

// Status code Boom (Baileys) yang menandakan koneksi/server bermasalah: timeout, closed, replaced, unavailable.
const SYSTEM_STATUS_CODES = new Set([408, 428, 429, 440, 500, 503, 515]);

const SYSTEM_MESSAGE_PATTERN = /time(?:d)?[\s-]?out|connection (?:closed|lost|failure)|not ready|stream errored|socket|network|rate[\s-]?overlimit|service unavailable/i;

/**
 * Membuat Error dengan penanda tambahan (mis. isHardBounce, sessionNeedsAction).
 * @param {string} message
 * @param {{ isHardBounce?: boolean, sessionNeedsAction?: boolean }} flags
 * @returns {Error}
 */
export function createFlaggedError(message, flags) {
  return Object.assign(new Error(message), flags);
}

/**
 * Menentukan apakah error berasal dari jaringan/sistem (bukan karena nomor tujuan).
 * @param {any} error
 * @returns {boolean}
 */
export function isNetworkOrSystemError(error) {
  if (!error) return false;
  if (NETWORK_ERROR_CODES.has(error.code)) return true;
  const statusCode = error.output?.statusCode ?? error.statusCode;
  if (SYSTEM_STATUS_CODES.has(statusCode)) return true;
  return SYSTEM_MESSAGE_PATTERN.test(String(error.message || ''));
}
