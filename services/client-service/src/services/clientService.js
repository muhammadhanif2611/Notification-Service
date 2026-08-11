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
  return await projectRepository.findAll();
}

// Layanan mengambil detail project berdasarkan ID
export async function getProjectById(projectId) {
  const project = await projectRepository.findByIdWithApiKeys(projectId);
  if (!project) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }
  return project;
}

// Layanan membuat project baru dengan validasi skema
export async function createProject(payload, userId = null) {
  const validation = createProjectSchema.safeParse(payload);
  if (!validation.success) {
    throw new AppError('Invalid project creation payload', 400, 'VALIDATION_ERROR', validation.error.errors);
  }

  const { name, slug, description, rateLimitPerMin, dailyQuota, webhookUrl, webhookSecret } = validation.data;
  try {
    const createdProject = await projectRepository.insert({
      name,
      slug: slug.toLowerCase().trim(),
      description,
      rate_limit_per_min: rateLimitPerMin,
      daily_quota: dailyQuota,
      webhook_url: webhookUrl,
      webhook_secret: webhookSecret
    });

    logger.info({ projectId: createdProject.id, slug: createdProject.slug }, 'Project created');
    writeAuditLog({ userId, action: 'CREATE_PROJECT', targetEntity: 'projects', detail: `Created project '${name}'` });
    return createdProject;
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError('Project slug already exists', 409, 'SLUG_EXISTS');
    }
    throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
  }
}

// Layanan memperbarui data project
export async function updateProject(projectId, updateData, userId = null) {
  const updatedProject = await projectRepository.updateById(projectId, updateData);
  if (!updatedProject) {
    throw new AppError('Project not found or update failed', 404, 'NOT_FOUND');
  }

  logger.info({ projectId }, 'Project updated');
  writeAuditLog({ userId, action: 'UPDATE_PROJECT', targetEntity: 'projects', detail: `Updated project ID ${projectId}` });
  return updatedProject;
}

// Layanan membuat API Key baru untuk project
export async function generateApiKey(payload, userId = null) {
  const validation = createApiKeySchema.safeParse(payload);
  if (!validation.success) {
    throw new AppError('Invalid API key payload', 400, 'VALIDATION_ERROR', validation.error.errors);
  }

  const { projectId, name, environment } = validation.data;
  const project = await projectRepository.findSlugAndNameById(projectId);
  if (!project) {
    throw new AppError('Associated project not found', 404, 'NOT_FOUND');
  }

  const isProduction = environment === 'production';
  const environmentPrefix = isProduction ? 'prod' : 'sand';
  const keyPrefix = isProduction ? 'ngw_prod_' : 'ngw_sand_';
  const rawApiKey = generateRawApiKey(environmentPrefix, project.slug);
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

  logger.info({ keyId: apiKeyRecord.id, projectId }, 'API Key generated');
  writeAuditLog({ userId, action: 'GENERATE_API_KEY', targetEntity: 'api_keys', detail: `Generated key '${name}' for project '${project.name}'` });
  return { rawApiKey, apiKeyInfo: apiKeyRecord };
}

// Layanan meregenerasi API Key yang sudah ada
export async function regenerateApiKey(keyId, userId = null) {
  const existingKey = await apiKeyRepository.findByIdWithProject(keyId);
  if (!existingKey) {
    throw new AppError('API Key not found', 404, 'NOT_FOUND');
  }

  const environmentPrefix = existingKey.environment === 'production' ? 'prod' : 'sand';
  const rawApiKey = generateRawApiKey(environmentPrefix, existingKey.projects.slug);
  const keyHash = await hashApiKey(rawApiKey);
  const keyPreview = extractKeyPreview(rawApiKey);

  const updatedKey = await apiKeyRepository.updateById(keyId, {
    key_hash: keyHash,
    key_preview: keyPreview,
    last_used_at: null,
    is_active: true
  });

  logger.info({ keyId }, 'API Key regenerated');
  writeAuditLog({ userId, action: 'REGENERATE_API_KEY', targetEntity: 'api_keys', detail: `Regenerated key '${existingKey.name}'` });
  return { rawApiKey, apiKeyInfo: updatedKey };
}

// Layanan menonaktifkan API Key
export async function deactivateApiKey(keyId, userId = null) {
  const deactivatedKey = await apiKeyRepository.updateById(keyId, { is_active: false }, '*');
  if (!deactivatedKey) {
    throw new AppError('API Key not found', 404, 'NOT_FOUND');
  }

  logger.info({ keyId }, 'API Key deactivated');
  writeAuditLog({ userId, action: 'DEACTIVATE_API_KEY', targetEntity: 'api_keys', detail: `Deactivated key ID ${keyId}` });
  return deactivatedKey;
}

// Layanan mengambil daftar template pesan
export async function listTemplates(projectId = null) {
  return await templateRepository.findAll(projectId);
}

// Layanan membuat template pesan baru
export async function createTemplate(payload, userId = null) {
  const validation = createTemplateSchema.safeParse(payload);
  if (!validation.success) {
    throw new AppError('Invalid template payload', 400, 'VALIDATION_ERROR', validation.error.errors);
  }

  const { projectId, name, code, channel, subject, body, variables } = validation.data;
  try {
    const createdTemplate = await templateRepository.insert({
      project_id: projectId,
      name,
      code: code.toLowerCase().trim(),
      channel: channel.toUpperCase(),
      subject,
      body,
      variables: variables || [],
      status: 'PENDING'
    });

    logger.info({ templateId: createdTemplate.id, code: createdTemplate.code }, 'Template created');
    writeAuditLog({ userId, action: 'CREATE_TEMPLATE', targetEntity: 'templates', detail: `Created template '${name}'` });
    return createdTemplate;
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError('Template code already exists', 409, 'TEMPLATE_CODE_EXISTS');
    }
    throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
  }
}

// Layanan memperbarui status persetujuan template
export async function updateTemplateStatus(templateId, { status, rejectionReason }, userId = null) {
  const VALID_STATUSES = ['APPROVED', 'REJECTED'];
  if (!VALID_STATUSES.includes(status)) {
    throw new AppError("Status must be 'APPROVED' or 'REJECTED'", 400, 'INVALID_STATUS');
  }

  const updatedTemplate = await templateRepository.updateStatusById(templateId, {
    status,
    rejection_reason: status === 'REJECTED' ? rejectionReason : null,
    updated_at: new Date().toISOString()
  });

  if (!updatedTemplate) {
    throw new AppError('Template not found', 404, 'NOT_FOUND');
  }

  logger.info({ templateId, status }, 'Template status updated');
  writeAuditLog({ userId, action: `TEMPLATE_${status}`, targetEntity: 'templates', detail: `Template ID ${templateId} set to ${status}` });
  return updatedTemplate;
}

// Layanan mengambil daftar metadata vendor
export async function listVendors() {
  return await vendorRepository.findAllOrderedByPriority();
}

// Layanan mendaftarkan vendor baru dengan enkripsi credentials
export async function createVendor(payload, userId = null) {
  const { name, channel, credentials, priority = 1 } = payload;
  if (!name || !channel || !credentials) {
    throw new AppError('Name, channel, and credentials are required', 400, 'VALIDATION_ERROR');
  }

  const { encryptedData, iv, authTag } = encryptAES(JSON.stringify(credentials));

  const registeredVendor = await vendorRepository.insert({
    name,
    channel: channel.toUpperCase(),
    credential_encrypted: encryptedData,
    credential_iv: iv,
    credential_auth_tag: authTag,
    priority
  });

  logger.info({ vendorId: registeredVendor.id, channel: registeredVendor.channel }, 'Vendor registered');
  writeAuditLog({ userId, action: 'CREATE_VENDOR', targetEntity: 'vendors', detail: `Registered vendor '${name}' for channel ${channel}` });
  return registeredVendor;
}
