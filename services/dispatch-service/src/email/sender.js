import nodemailer from 'nodemailer';
import { createLogger } from '@notification-gateway/shared';

const logger = createLogger('dispatch-service');

// Cache transporter per konfigurasi SMTP — transporter dibuat sekali dan dipakai ulang.
// TTL 10 menit agar perubahan credentials SMTP oleh admin tidak perlu restart service.
const TRANSPORTER_TTL_MS = 600000;
const transporterCache = new Map();

/**
 * Mengambil (atau membuat) transporter Nodemailer untuk kredensial SMTP tertentu.
 * Entri cache kedaluwarsa setelah TTL dan dibuat ulang secara otomatis.
 * @param {{ host: string, port?: number, secure?: boolean, user: string, pass: string }} credentials
 * @returns {import('nodemailer').Transporter}
 */
function getTransporter(credentials) {
  const cacheKey = `${credentials.host}:${credentials.port}:${credentials.user}`;
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
 * Mengirim email via Nodemailer (SMTP).
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
    throw new Error('No active EMAIL vendor configured. Register SMTP vendor via dashboard admin /vendors or run npm run setup:smtp.');
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
