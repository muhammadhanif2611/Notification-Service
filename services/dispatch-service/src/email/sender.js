import nodemailer from 'nodemailer';
import { createLogger } from '@notification-gateway/shared';

const logger = createLogger('dispatch-service');

export async function sendEmail({ recipient, subject, body, credentials, isSandbox }) {
  if (isSandbox || !credentials?.host) {
    logger.info({ recipient, subject }, '[SANDBOX] Email simulated');
    return { success: true, providerMessageId: `email.sandbox.${Date.now()}` };
  }

  const transporter = nodemailer.createTransport({
    host: credentials.host,
    port: credentials.port || 587,
    secure: credentials.secure || false,
    auth: { user: credentials.user, pass: credentials.pass }
  });

  const info = await transporter.sendMail({
    from: credentials.from || '"Notification Gateway" <no-reply@company.com>',
    to: recipient,
    subject: subject || 'Notification',
    html: body
  });

  return { success: true, providerMessageId: info.messageId };
}
