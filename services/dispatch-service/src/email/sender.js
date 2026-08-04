import nodemailer from 'nodemailer';

/**
 * Nodemailer Email Sender
 */
export async function sendEmail({ recipient, subject, body, credentials, isSandbox }) {
  if (isSandbox || !credentials || !credentials.host) {
    console.log(`[SANDBOX EMAIL] To: ${recipient} | Subject: ${subject}`);
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
