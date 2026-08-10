import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'notification_gateway_secret_key_2026';

function getAesKey() {
  if (process.env.AES_ENCRYPTION_KEY) {
    return Buffer.from(process.env.AES_ENCRYPTION_KEY, 'hex');
  }
  return crypto.scryptSync('notification_gateway_dev_key', 'salt', 32);
}

/**
 * Enkripsi plaintext menggunakan AES-256-GCM.
 * @param {string} plaintext
 * @returns {{ encryptedData: string, iv: string, authTag: string }}
 */
export function encryptAES(plaintext) {
  const key = getAesKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return {
    encryptedData: encrypted.toString('hex'),
    iv: iv.toString('hex'),
    authTag: cipher.getAuthTag().toString('hex')
  };
}

/**
 * Dekripsi hasil dari encryptAES().
 * @param {{ encryptedData: string, iv: string, authTag: string }} payload
 * @returns {string}
 */
export function decryptAES({ encryptedData, iv, authTag }) {
  const key = getAesKey();
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData, 'hex')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}

/**
 * Generate HMAC SHA-256 signature untuk verifikasi webhook.
 * @param {object|string} payload
 * @param {string} secret
 * @returns {string}
 */
export function generateWebhookSignature(payload, secret) {
  const data = typeof payload === 'object' ? JSON.stringify(payload) : payload;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/** @param {string} rawText @returns {Promise<string>} */
export async function hashApiKey(rawText) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(rawText, salt);
}

/** @param {string} rawText @param {string} hashedText @returns {Promise<boolean>} */
export async function verifyApiKey(rawText, hashedText) {
  return bcrypt.compare(rawText, hashedText);
}

/**
 * Generate API Key dengan prefix environment dan project slug.
 * @param {'prod'|'sand'} env
 * @param {string} projectSlug
 * @returns {string}
 */
export function generateRawApiKey(env = 'prod', projectSlug = 'app') {
  const prefix = env === 'prod' ? 'ngw_prod_' : 'ngw_sand_';
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const cleanSlug = projectSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${prefix}${cleanSlug}_${randomBytes}`;
}

/** Ambil 8 karakter terakhir API Key untuk ditampilkan di dashboard. */
export function extractKeyPreview(rawKey) {
  return rawKey.slice(-8);
}

/** @param {object} payload @param {string} [expiresIn] @returns {string} */
export function generateAuthToken(payload, expiresIn = '8h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/** @param {string} token @returns {object|null} */
export function verifyAuthToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
