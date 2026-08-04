import nodemailer from 'nodemailer';

/**
 * Email SMTP / Resend Provider Adapter
 */
export async function sendEmailMessage({ recipient, subject, body, credentials }) {
  if (!credentials || !credentials.host) {
    console.log(`[SIMULATION EMAIL] Sending to ${recipient}: ${subject || 'Notification'}`);
    return {
      success: true,
      providerMessageId: `email_msg_${Date.now()}`
    };
  }

  const transporter = nodemailer.createTransport({
    host: credentials.host,
    port: credentials.port || 587,
    secure: credentials.secure || false,
    auth: {
      user: credentials.user,
      pass: credentials.pass
    }
  });

  const info = await transporter.sendMail({
    from: credentials.from || '"Notification Gateway" <no-reply@company.com>',
    to: recipient,
    subject: subject || 'Notification',
    html: body
  });

  return {
    success: true,
    providerMessageId: info.messageId
  };
}
