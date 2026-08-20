import nodemailer from 'nodemailer';
import { createLogger } from '@notification-gateway/shared';

const logger = createLogger('dispatch-service');

// Cache transporter per konfigurasi SMTP — transporter dibuat sekali dan dipakai ulang
const transporterCache = new Map();

/**
 * Mengambil (atau membuat) transporter Nodemailer untuk kredensial SMTP tertentu.
 * @param {{ host: string, port?: number, secure?: boolean, user: string, pass: string }} credentials
 * @returns {import('nodemailer').Transporter}
 */
function getTransporter(credentials) {
  const cacheKey = `${credentials.host}:${credentials.port}:${credentials.user}`;

  if (!transporterCache.has(cacheKey)) {
    transporterCache.set(cacheKey, nodemailer.createTransport({
      host: credentials.host,
      port: credentials.port || 587,
      secure: credentials.secure || false,
      auth: { user: credentials.user, pass: credentials.pass },
      pool: true,
      maxConnections: 3
    }));
  }

  return transporterCache.get(cacheKey);
}

/**
 * Mengirim email via Nodemailer (SMTP).
 * @param {{ recipient: string, subject: string, body: string, credentials: object|null, isSandbox: boolean }} params
 * @returns {Promise<{ success: boolean, providerMessageId: string }>}
 */
export async function sendEmail({ recipient, subject, body, credentials, isSandbox }) {
  if (isSandbox || !credentials?.host) {
    logger.info({ recipient, subject }, '[SANDBOX] Email simulated');
    return { success: true, providerMessageId: `email.sandbox.${Date.now()}` };
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
