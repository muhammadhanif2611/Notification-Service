import {
  generateRawApiKey,
  hashApiKey,
  extractKeyPreview,
  verifyApiKey,
  generateAuthToken,
  createProjectSchema,
  createApiKeySchema
} from '@notification-gateway/shared';
import * as adminUserRepository from '../repositories/adminUserRepository.js';
import * as projectRepository from '../repositories/projectRepository.js';
import * as apiKeyRepository from '../repositories/apiKeyRepository.js';

// Layanan autentikasi login admin
export async function loginAdmin({ email, password }) {
  if (!email || !password) {
    throw { statusCode: 400, message: 'Email and password are required.' };
  }

  const user = await adminUserRepository.findActiveByEmail(email.toLowerCase().trim());
  if (!user) throw { statusCode: 401, message: 'Invalid email or password.' };

  const isValid = await verifyApiKey(password, user.password_hash);
  if (!isValid) throw { statusCode: 401, message: 'Invalid email or password.' };

  const token = generateAuthToken({ userId: user.id, email: user.email, name: user.name, role: user.role });
  adminUserRepository.updateLastLogin(user.id);

  return { token, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
}

// Layanan mengambil semua daftar project
export async function listProjects() {
  return await projectRepository.findAll();
}

// Layanan membuat project baru
export async function createProject(payload) {
  const parse = createProjectSchema.safeParse(payload);
  if (!parse.success) {
    throw { statusCode: 400, details: parse.error.errors };
  }

  return await projectRepository.insert({
    name: parse.data.name,
    slug: parse.data.slug,
    description: parse.data.description,
    rate_limit_per_min: parse.data.rateLimitPerMin,
    daily_quota: parse.data.dailyQuota,
    webhook_url: parse.data.webhookUrl,
    webhook_secret: parse.data.webhookSecret
  });
}

// Layanan membuat API Key baru
export async function generateApiKey(payload) {
  const parse = createApiKeySchema.safeParse(payload);
  if (!parse.success) {
    throw { statusCode: 400, details: parse.error.errors };
  }

  const project = await projectRepository.findSlugById(parse.data.projectId);
  if (!project) throw { statusCode: 404, message: 'Project not found' };

  const envPrefix = parse.data.environment === 'production' ? 'prod' : 'sand';
  const rawKey = generateRawApiKey(envPrefix, project.slug);
  const keyHash = await hashApiKey(rawKey);
  const keyPreview = extractKeyPreview(rawKey);
  const keyPrefix = envPrefix === 'prod' ? 'ngw_prod_' : 'ngw_sand_';

  const data = await apiKeyRepository.insert({
    project_id: parse.data.projectId,
    name: parse.data.name,
    key_prefix: keyPrefix,
    key_hash: keyHash,
    key_preview: keyPreview,
    environment: parse.data.environment
  });

  return { rawApiKey: rawKey, apiKeyInfo: data };
}
