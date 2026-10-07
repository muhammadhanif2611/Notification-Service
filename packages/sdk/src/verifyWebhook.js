import { createHmac, timingSafeEqual } from 'node:crypto';

// Toleransi timestamp (detik) untuk mencegah replay attack — ala Svix (5 menit)
const DEFAULT_TOLERANCE_SECONDS = 300;

// Normalisasi secret → Buffer kunci HMAC (secret whsec_ di-decode dari base64)
function getSecretBytes(secret) {
  if (secret.startsWith('whsec_')) {
    return Buffer.from(secret.slice('whsec_'.length), 'base64');
  }
  return Buffer.from(secret, 'utf8');
}

function safeCompare(a, b) {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Memverifikasi signature webhook LEGACY (HMAC hex dari JSON body) — dipertahankan
// agar integrasi lama yang memakai client.verifyWebhook() tidak rusak.
export function verifyWebhookSignature({ payload, signature, secret }) {
  if (!payload || !signature || !secret) {
    throw new Error('payload, signature, and secret are required');
  }

  const expectedSignature = createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');

  return safeCompare(signature, expectedSignature);
}

// Verifikasi webhook skema BARU (ala Resend/Svix).
// Melempar error jika invalid; mengembalikan payload hasil parse jika valid.
//
// Contoh penggunaan di project lain (Express):
//   app.post('/webhook/notification', express.raw({ type: 'application/json' }), (req, res) => {
//     try {
//       const event = client.webhooks.verify({
//         payload: req.body.toString(),          // raw body WAJIB string mentah
//         headers: {
//           id: req.headers['webhook-id'],
//           timestamp: req.headers['webhook-timestamp'],
//           signature: req.headers['webhook-signature'],
//         },
//         secret: process.env.NGW_WEBHOOK_SECRET, // whsec_...
//       });
//       console.log(event.type, event.data.messageId);
//       res.json({ received: true });
//     } catch {
//       res.status(400).json({ error: 'Invalid webhook' });
//     }
//   });
export function verifyWebhook({ payload, headers, secret, tolerance = DEFAULT_TOLERANCE_SECONDS }) {
  if (!payload || !headers || !secret) {
    throw new Error('payload, headers, and secret are required');
  }

  const id = headers.id;
  const timestamp = headers.timestamp;
  const signature = headers.signature;

  if (!id || !timestamp || !signature) {
    throw new Error('Missing webhook headers: webhook-id, webhook-timestamp, webhook-signature wajib ada');
  }

  // 1. Cek timestamp untuk mencegah replay attack
  const nowSeconds = Math.floor(Date.now() / 1000);
  const timestampSeconds = parseInt(timestamp, 10);
  if (Number.isNaN(timestampSeconds)) {
    throw new Error('Invalid webhook timestamp');
  }
  if (nowSeconds - timestampSeconds > tolerance) {
    throw new Error('Webhook timestamp terlalu lama (kemungkinan replay attack)');
  }
  if (timestampSeconds > nowSeconds + tolerance) {
    throw new Error('Webhook timestamp berada di masa depan');
  }

  // 2. Hitung ulang signature dari raw body — tidak ada re-stringify JSON
  const rawBody = typeof payload === 'string' ? payload : payload.toString('utf8');
  const key = getSecretBytes(secret);
  const expectedSignature = `v1,${createHmac('sha256', key)
    .update(`${id}.${timestamp}.${rawBody}`)
    .digest('base64')}`;

  // Header dapat memuat beberapa signature dipisah spasi (format Svix saat rotasi secret)
  const signatures = String(signature).split(' ');
  const isValid = signatures.some((sig) => safeCompare(sig, expectedSignature));

  if (!isValid) {
    throw new Error('Webhook signature tidak valid');
  }

  return JSON.parse(rawBody);
}

// Class wrapper agar pola pakainya mirip Resend: client.webhooks.verify(...)
export class WebhooksClient {
  verify({ payload, headers, secret, tolerance }) {
    return verifyWebhook({ payload, headers, secret, tolerance });
  }
}
