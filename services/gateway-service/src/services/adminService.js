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

  const adminUser = await adminUserRepository.findActiveByEmail(email.toLowerCase().trim());
  if (!adminUser) {
    throw { statusCode: 401, message: 'Invalid email or password.' };
  }

  const isPasswordValid = await verifyApiKey(password, adminUser.password_hash);
  if (!isPasswordValid) {
    throw { statusCode: 401, message: 'Invalid email or password.' };
  }

  const token = generateAuthToken({
    userId: adminUser.id,
    email: adminUser.email,
    name: adminUser.name,
    role: adminUser.role
  });

  adminUserRepository.updateLastLogin(adminUser.id);

  return {
    token,
    user: { id: adminUser.id, email: adminUser.email, name: adminUser.name, role: adminUser.role }
  };
}

// Layanan mengambil semua daftar project
export async function listProjects() {
  return await projectRepository.findAll();
}

// Layanan membuat project baru
export async function createProject(payload) {
  const validation = createProjectSchema.safeParse(payload);
  if (!validation.success) {
    throw { statusCode: 400, details: validation.error.errors };
  }

  const { name, slug, description, rateLimitPerMin, dailyQuota, webhookUrl, webhookSecret } = validation.data;
  return await projectRepository.insert({
    name,
    slug,
    description,
    rate_limit_per_min: rateLimitPerMin,
    daily_quota: dailyQuota,
    webhook_url: webhookUrl,
    webhook_secret: webhookSecret
  });
}

// Layanan membuat API Key baru
export async function generateApiKey(payload) {
  const validation = createApiKeySchema.safeParse(payload);
  if (!validation.success) {
    throw { statusCode: 400, details: validation.error.errors };
  }

  const { projectId, name, environment } = validation.data;
  const projectRecord = await projectRepository.findSlugById(projectId);
  if (!projectRecord) {
    throw { statusCode: 404, message: 'Project not found' };
  }

  const isProduction = environment === 'production';
  const environmentPrefix = isProduction ? 'prod' : 'sand';
  const keyPrefix = isProduction ? 'ngw_prod_' : 'ngw_sand_';
  const rawApiKey = generateRawApiKey(environmentPrefix, projectRecord.slug);
  const keyHash = await hashApiKey(rawApiKey);
  const keyPreview = extractKeyPreview(rawApiKey);

  const apiKeyRecord = await apiKeyRepository.insert({
    project_id: projectId,
    name,
    key_prefix: keyPrefix,
    key_hash: keyHash,
    key_preview: keyPreview,
    environment
  });

  return { rawApiKey, apiKeyInfo: apiKeyRecord };
}
