import crypto from 'node:crypto';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonResponse(payload, status = 200) {
  return Response.json(payload, { status });
}

const TRANSPORTER_TTL_MS = 10 * 60 * 1000;
const transporterCache = new Map();

function sha256(value) {
  return crypto.createHash('sha256').update(String(value)).digest();
}

function isValidRelaySecret(providedSecret, expectedSecret) {
  if (!providedSecret || !expectedSecret) return false;
  return crypto.timingSafeEqual(sha256(providedSecret), sha256(expectedSecret));
}

function resolveSmtpCredentials(bodyCredentials) {
  if (bodyCredentials?.host) {
    return {
      host: bodyCredentials.host,
      port: Number(bodyCredentials.port) || 587,
      secure: Boolean(bodyCredentials.secure),
      user: bodyCredentials.user || '',
      pass: bodyCredentials.pass || '',
      from: bodyCredentials.from || process.env.SMTP_FROM || ''
    };
  }

  if (process.env.SMTP_HOST) {
    return {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
      from: process.env.SMTP_FROM || ''
    };
  }

  return null;
}

function getTransporter(credentials) {
  const port = Number(credentials.port) || 587;
  const secure = Boolean(credentials.secure);
  const passHash = crypto.createHash('sha256').update(String(credentials.pass || '')).digest('hex').slice(0, 12);
  const cacheKey = `${credentials.host}:${port}:${secure}:${credentials.user || ''}:${passHash}`;
  const cached = transporterCache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < TRANSPORTER_TTL_MS) {
    return { transporter: cached.transporter, cacheKey };
  }

  const transportOptions = {
    host: credentials.host,
    port,
    secure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000
  };

  if (credentials.user && credentials.pass) {
    transportOptions.auth = { user: credentials.user, pass: credentials.pass };
  }

  const transporter = nodemailer.createTransport(transportOptions);
  transporterCache.set(cacheKey, { transporter, createdAt: Date.now() });
  return { transporter, cacheKey };
}

/**
 * Health check ringan untuk memastikan endpoint email relay aktif di Vercel.
 */
export async function GET() {
  return jsonResponse({
    success: true,
    service: 'vercel-email-relay',
    configured: Boolean(process.env.EMAIL_RELAY_SECRET)
  });
}

/**
 * Serverless Function Nodemailer untuk meneruskan pengiriman email SMTP dari Railway dispatch-service.
 */
export async function POST(request) {
  const expectedSecret = process.env.EMAIL_RELAY_SECRET;
  if (!expectedSecret) {
    return jsonResponse(
      { success: false, isVendorConfigError: true, error: 'EMAIL_RELAY_SECRET is not configured on Vercel relay' },
      500
    );
  }

  const providedSecret = request.headers.get('x-relay-secret') || '';
  if (!isValidRelaySecret(providedSecret, expectedSecret)) {
    return jsonResponse(
      { success: false, isVendorConfigError: true, error: 'Unauthorized email relay request' },
      401
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(
      { success: false, isVendorConfigError: true, error: 'Invalid JSON payload' },
      400
    );
  }

  const toAddress = payload?.recipient || payload?.to;
  const htmlContent = payload?.body ?? payload?.html ?? '';
  const subject = payload?.subject || 'Notification';

  if (!toAddress || typeof toAddress !== 'string') {
    return jsonResponse(
      { success: false, isVendorConfigError: true, error: 'Recipient email address is required' },
      400
    );
  }

  const credentials = resolveSmtpCredentials(payload?.credentials);
  if (!credentials?.host) {
    return jsonResponse(
      { success: false, isVendorConfigError: true, error: 'No SMTP host configured for email relay' },
      400
    );
  }

  const { transporter, cacheKey } = getTransporter(credentials);
  try {
    const info = await transporter.sendMail({
      from: credentials.from || '"Notification Gateway" <no-reply@company.com>',
      to: toAddress,
      subject,
      html: htmlContent
    });

    return jsonResponse({
      success: true,
      providerMessageId: info.messageId
    });
  } catch (error) {
    transporterCache.delete(cacheKey);
    const isAuthError = error?.code === 'EAUTH';
    return jsonResponse(
      {
        success: false,
        error: error?.message || 'SMTP delivery failed via Vercel relay',
        code: error?.code || null,
        responseCode: error?.responseCode || null,
        response: error?.response || null,
        isVendorConfigError: isAuthError
      },
      502
    );
  }
}
