import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { createLogger } from '@notification-gateway/shared';

const logger = createLogger('dispatch-service');

// Cache transporter per konfigurasi SMTP — transporter dibuat sekali dan dipakai ulang.
// TTL 10 menit; menyertakan hash password di key agar rotasi kredensial langsung memakai transporter baru.
const TRANSPORTER_TTL_MS = 600000;
const transporterCache = new Map();

/**
 * Mengambil (atau membuat) transporter Nodemailer untuk kredensial SMTP tertentu.
 * Entri cache kedaluwarsa setelah TTL dan dibuat ulang secara otomatis.
 * @param {{ host: string, port?: number, secure?: boolean, user: string, pass: string }} credentials
 * @returns {import('nodemailer').Transporter}
 */
function getTransporter(credentials) {
  const passHash = crypto.createHash('sha256').update(String(credentials.pass || '')).digest('hex').slice(0, 12);
  const cacheKey = `${credentials.host}:${credentials.port}:${credentials.user}:${passHash}`;
  const cached = transporterCache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < TRANSPORTER_TTL_MS) {
    return cached.transporter;
  }

  const transporter = nodemailer.createTransport({
    host: credentials.host,
    port: credentials.port || 587,
    secure: credentials.secure || false,
    auth: { user: credentials.user, pass: credentials.pass },
    pool: true,
    maxConnections: 3
  });

  transporterCache.set(cacheKey, { transporter, createdAt: Date.now() });
  return transporter;
}

/**
 * Mengirim email melalui endpoint HTTP Vercel Nodemailer Relay agar bebas blokir port SMTP Railway.
 * Mempertahankan metadata error SMTP (code, responseCode, response, isVendorConfigError) untuk worker retry/suppression.
 */
async function sendViaRelay({ relayUrl, recipient, subject, body, credentials }) {
  const relaySecret = process.env.EMAIL_RELAY_SECRET?.trim() || '';
  const response = await fetch(relayUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(relaySecret ? { 'x-relay-secret': relaySecret } : {})
    },
    body: JSON.stringify({
      recipient,
      subject: subject || 'Notification',
      body,
      credentials
    }),
    signal: AbortSignal.timeout(25000)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.success) {
    const err = new Error(data?.error || `Email relay failed (HTTP ${response.status})`);
    if (data?.code) err.code = data.code;
    if (data?.responseCode) err.responseCode = data.responseCode;
    if (data?.response) err.response = data.response;
    err.isVendorConfigError = Boolean(
      data?.isVendorConfigError || [400, 401, 403].includes(response.status)
    );
    throw err;
  }

  return { success: true, providerMessageId: data.providerMessageId };
}

/**
 * Mengirim email via HTTP Relay Vercel (jika EMAIL_RELAY_URL diset) atau Nodemailer (SMTP langsung).
 * @param {{ recipient: string, subject: string, body: string, credentials: object|null, isSandbox: boolean }} params
 * @returns {Promise<{ success: boolean, providerMessageId: string }>}
 */
export async function sendEmail({ recipient, subject, body, credentials, isSandbox }) {
  if (isSandbox) {
    logger.info({ recipient, subject }, '[SANDBOX] Email simulated');
    return { success: true, providerMessageId: `email.sandbox.${Date.now()}` };
  }

  // Mode produksi TANPA vendor SMTP aktif = error nyata, bukan simulasi diam-diam.
  // Sebelumnya kondisi ini disimulasikan seolah berhasil sehingga email tidak pernah terkirim.
  if (!credentials?.host) {
    throw Object.assign(
      new Error('No active EMAIL vendor configured. Register SMTP vendor via dashboard admin /vendors or run npm run setup:smtp.'),
      { isVendorConfigError: true }
    );
  }

  const relayUrl = process.env.EMAIL_RELAY_URL?.trim();
  if (relayUrl) {
    logger.info({ recipient, relayUrl }, 'Dispatching email via Vercel Nodemailer relay');
    return sendViaRelay({ relayUrl, recipient, subject, body, credentials });
  }

  const transporter = getTransporter(credentials);
  const info = await transporter.sendMail({
    from: credentials.from || '"Notification Gateway" <no-reply@company.com>',
    to: recipient,
    subject: subject || 'Notification',
    html: body
  });

  return { success: true, providerMessageId: info.messageId };
}
