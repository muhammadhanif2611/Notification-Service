import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'notification_gateway_secret_key_2026';

/**
 * Generate HMAC SHA-256 signature for webhook payload verification.
 * @param {object|string} payload 
 * @param {string} secret 
 * @returns {string} hex signature
 */
export function generateWebhookSignature(payload, secret) {
  const data = typeof payload === 'object' ? JSON.stringify(payload) : payload;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Hash raw text (API Key or Password) using bcrypt.
 * @param {string} rawText 
 * @returns {Promise<string>}
 */
export async function hashApiKey(rawText) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(rawText, salt);
}

/**
 * Verify raw text against hashed text.
 * @param {string} rawText 
 * @param {string} hashedText 
 * @returns {Promise<boolean>}
 */
export async function verifyApiKey(rawText, hashedText) {
  return bcrypt.compare(rawText, hashedText);
}

/**
 * Generate a random API key with given environment prefix and project identifier.
 * @param {'prod'|'sand'} env 
 * @param {string} projectSlug 
 * @returns {string} e.g. ngw_prod_hris_a1b2c3d4e5f6...
 */
export function generateRawApiKey(env = 'prod', projectSlug = 'app') {
  const prefix = env === 'prod' ? 'ngw_prod_' : 'ngw_sand_';
  const randomBytes = crypto.randomBytes(24).toString('hex');
  const cleanSlug = projectSlug.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${prefix}${cleanSlug}_${randomBytes}`;
}

/**
 * Generate Custom JWT Token for Admin Session Auth
 * @param {object} payload 
 * @param {string} [expiresIn] 
 * @returns {string}
 */
export function generateAuthToken(payload, expiresIn = '24h') {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

/**
 * Verify Custom JWT Token
 * @param {string} token 
 * @returns {object|null}
 */
export function verifyAuthToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}
