import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'notification_gateway_secret_key_2026';

// Helper mengambil kunci enkripsi AES
function getAesKey() {
  if (process.env.AES_ENCRYPTION_KEY) {
    return Buffer.from(process.env.AES_ENCRYPTION_KEY, 'hex');
  }
  return crypto.scryptSync('notification_gateway_dev_key', 'salt', 32);
}

// Enkripsi plaintext menggunakan AES-256-GCM
export function encryptAES(plaintext) {
  const encryptionKey = getAesKey();
  const initializationVector = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, initializationVector);
  const encryptedBuffer = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    encryptedData: encryptedBuffer.toString('hex'),
    iv: initializationVector.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex')
  };
}

// Dekripsi data hasil enkripsi AES-256-GCM
export function decryptAES({ encryptedData, iv, authTag }) {
  const decryptionKey = getAesKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', decryptionKey, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  const decryptedBuffer = Buffer.concat([
    decipher.update(Buffer.from(encryptedData, 'hex')),
    decipher.final()
  ]);
  return decryptedBuffer.toString('utf8');
}

// Generate HMAC SHA-256 signature untuk verifikasi webhook
export function generateWebhookSignature(payload, secret) {
  const dataString = typeof payload === 'object' ? JSON.stringify(payload) : payload;
  return crypto.createHmac('sha256', secret).update(dataString).digest('hex');
}

// Generasi hash aman untuk password atau API Key
export async function hashApiKey(rawText) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(rawText, salt);
}

// Verifikasi kaitan teks asli dengan hash bcrypt
export async function verifyApiKey(rawText, hashedText) {
  return bcrypt.compare(rawText, hashedText);
}

// Generate API Key mentah dengan prefix environment dan project slug
export function generateRawApiKey(environment = 'prod', projectSlug = 'app') {
  const prefix = environment === 'prod' ? 'ngw_prod_' : 'ngw_sand_';
  const randomHexBytes = crypto.randomBytes(24).toString('hex');
  const sanitizedSlug = projectSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${prefix}${sanitizedSlug}_${randomHexBytes}`;
}

// Mengambil 8 karakter terakhir API Key untuk tampilan dashboard
export function extractKeyPreview(rawApiKey) {
  return rawApiKey.slice(-8);
}

// Membuat JWT Token autentikasi pengguna
export function generateAuthToken(payload, expiresIn = '8h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

// Verifikasi keabsahan JWT Token autentikasi
export function verifyAuthToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
