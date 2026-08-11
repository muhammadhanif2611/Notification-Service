import { createHmac, timingSafeEqual } from 'node:crypto';

// Memverifikasi signature webhook dari Notification Gateway
export function verifyWebhookSignature({ payload, signature, secret }) {
  if (!payload || !signature || !secret) {
    throw new Error('payload, signature, and secret are required');
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(signatureBuffer, expectedBuffer);
}
