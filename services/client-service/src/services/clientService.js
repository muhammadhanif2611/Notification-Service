import { writeAuditLog } from '@notification-gateway/database';
import {
  generateRawApiKey,
  hashApiKey,
  extractKeyPreview,
  encryptAES,
  createProjectSchema,
  createApiKeySchema,
  createTemplateSchema,
  createLogger
} from '@notification-gateway/shared';
import { AppError } from '../middlewares/errorHandler.js';
import * as projectRepository from '../repositories/projectRepository.js';
import * as apiKeyRepository from '../repositories/apiKeyRepository.js';
import * as templateRepository from '../repositories/templateRepository.js';
import * as vendorRepository from '../repositories/vendorRepository.js';

const logger = createLogger('client-service');

// Layanan mengambil daftar semua project
export async function listProjects() {
  try {
    return await projectRepository.findAll();
  } catch (error) {
    throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
  }
}

// Layanan mengambil detail project berdasarkan ID
export async function getProjectById(projectId) {
  try {
    const data = await projectRepository.findByIdWithApiKeys(projectId);
    if (!data) throw new AppError('Project not found', 404, 'NOT_FOUND');
    return data;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }
}

// Layanan membuat project baru
export async function createProject(payload, userId = null) {
  const parse = createProjectSchema.safeParse(payload);
  if (!parse.success) {
    throw new AppError('Invalid project creation payload', 400, 'VALIDATION_ERROR', parse.error.errors);
  }

  try {
    const data = await projectRepository.insert({
      name: parse.data.name,
      slug: parse.data.slug.toLowerCase().trim(),
      description: parse.data.description,
      rate_limit_per_min: parse.data.rateLimitPerMin,
      daily_quota: parse.data.dailyQuota,
      webhook_url: parse.data.webhookUrl,
      webhook_secret: parse.data.webhookSecret
    });

    logger.info({ projectId: data.id, slug: data.slug }, 'Project created');
    writeAuditLog({ userId, action: 'CREATE_PROJECT', targetEntity: 'projects', detail: `Created project '${parse.data.name}'` });
    return data;
  } catch (error) {
    if (error.code === '23505') throw new AppError('Project slug already exists', 409, 'SLUG_EXISTS');
    throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
  }
}

// Layanan memperbarui data project
export async function updateProject(projectId, updateData, userId = null) {
  try {
    const data = await projectRepository.updateById(projectId, updateData);

    logger.info({ projectId }, 'Project updated');
    writeAuditLog({ userId, action: 'UPDATE_PROJECT', targetEntity: 'projects', detail: `Updated project ID ${projectId}` });
    return data;
  } catch (error) {
    throw new AppError(`Failed to update project: ${error.message}`, 500, 'DATABASE_ERROR');
  }
}

// Layanan membuat API Key baru untuk project
export async function generateApiKey(payload, userId = null) {
  const parse = createApiKeySchema.safeParse(payload);
  if (!parse.success) {
    throw new AppError('Invalid API key payload', 400, 'VALIDATION_ERROR', parse.error.errors);
  }

  let project;
  try {
    project = await projectRepository.findSlugAndNameById(parse.data.projectId);
  } catch {
    throw new AppError('Associated project not found', 404, 'NOT_FOUND');
  }
  if (!project) throw new AppError('Associated project not found', 404, 'NOT_FOUND');

  const envPrefix = parse.data.environment === 'production' ? 'prod' : 'sand';
  const rawKey = generateRawApiKey(envPrefix, project.slug);
  const [keyHash, keyPreview, keyPrefix] = [
    await hashApiKey(rawKey),
    extractKeyPreview(rawKey),
    envPrefix === 'prod' ? 'ngw_prod_' : 'ngw_sand_'
  ];

  try {
    const data = await apiKeyRepository.insert({
      project_id: parse.data.projectId,
      name: parse.data.name,
      key_prefix: keyPrefix,
      key_hash: keyHash,
      key_preview: keyPreview,
      environment: parse.data.environment
    });

    logger.info({ keyId: data.id, projectId: parse.data.projectId }, 'API Key generated');
    writeAuditLog({ userId, action: 'GENERATE_API_KEY', targetEntity: 'api_keys', detail: `Generated key '${parse.data.name}' for project '${project.name}'` });
    return { rawApiKey: rawKey, apiKeyInfo: data };
  } catch (error) {
    throw new AppError(`Failed to generate API Key: ${error.message}`, 500, 'DATABASE_ERROR');
  }
}

// Layanan meregenerasi API Key yang sudah ada
export async function regenerateApiKey(keyId, userId = null) {
  let existing;
  try {
    existing = await apiKeyRepository.findByIdWithProject(keyId);
  } catch {
    throw new AppError('API Key not found', 404, 'NOT_FOUND');
  }
  if (!existing) throw new AppError('API Key not found', 404, 'NOT_FOUND');

  const envPrefix = existing.environment === 'production' ? 'prod' : 'sand';
  const rawKey = generateRawApiKey(envPrefix, existing.projects.slug);
  const keyHash = await hashApiKey(rawKey);
  const keyPreview = extractKeyPreview(rawKey);

  try {
    const data = await apiKeyRepository.updateById(keyId, {
      key_hash: keyHash,
      key_preview: keyPreview,
      last_used_at: null,
      is_active: true
    });

    logger.info({ keyId }, 'API Key regenerated');
    writeAuditLog({ userId, action: 'REGENERATE_API_KEY', targetEntity: 'api_keys', detail: `Regenerated key '${existing.name}'` });
    return { rawApiKey: rawKey, apiKeyInfo: data };
  } catch (error) {
    throw new AppError(`Failed to regenerate API Key: ${error.message}`, 500, 'DATABASE_ERROR');
  }
}

// Layanan menonaktifkan API Key
export async function deactivateApiKey(keyId, userId = null) {
  try {
    const data = await apiKeyRepository.updateById(keyId, { is_active: false }, '*');

    logger.info({ keyId }, 'API Key deactivated');
    writeAuditLog({ userId, action: 'DEACTIVATE_API_KEY', targetEntity: 'api_keys', detail: `Deactivated key ID ${keyId}` });
    return data;
  } catch (error) {
    throw new AppError(`Failed to deactivate API Key: ${error.message}`, 500, 'DATABASE_ERROR');
  }
}

// Layanan mengambil daftar template pesan
export async function listTemplates(projectId = null) {
  try {
    return await templateRepository.findAll(projectId);
  } catch (error) {
    throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
  }
}

// Layanan membuat template pesan baru
export async function createTemplate(payload, userId = null) {
  const parse = createTemplateSchema.safeParse(payload);
  if (!parse.success) {
    throw new AppError('Invalid template payload', 400, 'VALIDATION_ERROR', parse.error.errors);
  }

  try {
    const data = await templateRepository.insert({
      project_id: parse.data.projectId,
      name: parse.data.name,
      code: parse.data.code.toLowerCase().trim(),
      channel: parse.data.channel.toUpperCase(),
      subject: parse.data.subject,
      body: parse.data.body,
      variables: parse.data.variables || [],
      status: 'PENDING'
    });

    logger.info({ templateId: data.id, code: data.code }, 'Template created');
    writeAuditLog({ userId, action: 'CREATE_TEMPLATE', targetEntity: 'templates', detail: `Created template '${parse.data.name}'` });
    return data;
  } catch (error) {
    if (error.code === '23505') throw new AppError('Template code already exists', 409, 'TEMPLATE_CODE_EXISTS');
    throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
  }
}

// Layanan memperbarui status persetujuan template
export async function updateTemplateStatus(templateId, { status, rejectionReason }, userId = null) {
  const VALID_STATUSES = ['APPROVED', 'REJECTED'];
  if (!VALID_STATUSES.includes(status)) {
    throw new AppError("Status must be 'APPROVED' or 'REJECTED'", 400, 'INVALID_STATUS');
  }

  try {
    const data = await templateRepository.updateStatusById(templateId, {
      status,
      rejection_reason: status === 'REJECTED' ? rejectionReason : null,
      updated_at: new Date().toISOString()
    });

    logger.info({ templateId, status }, 'Template status updated');
    writeAuditLog({ userId, action: `TEMPLATE_${status}`, targetEntity: 'templates', detail: `Template ID ${templateId} set to ${status}` });
    return data;
  } catch (error) {
    throw new AppError(`Failed to update template status: ${error.message}`, 500, 'DATABASE_ERROR');
  }
}

// Layanan mengambil daftar metadata vendor
export async function listVendors() {
  try {
    return await vendorRepository.findAllOrderedByPriority();
  } catch (error) {
    throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
  }
}

// Layanan mendaftarkan vendor baru dengan enkripsi credentials
export async function createVendor(payload, userId = null) {
  const { name, channel, credentials, priority = 1 } = payload;
  if (!name || !channel || !credentials) {
    throw new AppError('Name, channel, and credentials are required', 400, 'VALIDATION_ERROR');
  }

  const { encryptedData, iv, authTag } = encryptAES(JSON.stringify(credentials));

  try {
    const data = await vendorRepository.insert({
      name,
      channel: channel.toUpperCase(),
      credential_encrypted: encryptedData,
      credential_iv: iv,
      credential_auth_tag: authTag,
      priority
    });

    logger.info({ vendorId: data.id, channel: data.channel }, 'Vendor registered');
    writeAuditLog({ userId, action: 'CREATE_VENDOR', targetEntity: 'vendors', detail: `Registered vendor '${name}' for channel ${channel}` });
    return data;
  } catch (error) {
    throw new AppError(`Failed to register vendor: ${error.message}`, 500, 'DATABASE_ERROR');
  }
}
