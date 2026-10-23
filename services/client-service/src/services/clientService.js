import { writeAuditLog } from '@notification-gateway/database';
import {
  generateRawApiKey,
  hashApiKey,
  extractKeyPreview,
  encryptAES,
  createProjectSchema,
  updateProjectSchema,
  createApiKeySchema,
  updateApiKeySchema,
  createVendorSchema,
  updateVendorSchema,
  createLogger
} from '@notification-gateway/shared';
import { AppError } from '../middlewares/errorHandler.js';
import * as projectRepository from '../repositories/projectRepository.js';
import * as apiKeyRepository from '../repositories/apiKeyRepository.js';
import * as vendorRepository from '../repositories/vendorRepository.js';

const logger = createLogger('client-service');export async function listProjects(user = null) {
  if (user?.role === 'admin') {
    return await projectRepository.findAll();
  }
  return await projectRepository.findByOwnerId(user?.userId);
}export async function getProjectById(projectId) {
  const project = await projectRepository.findByIdWithApiKeys(projectId);
  if (!project) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }
  return project;
}// Model 2: Pengajuan Mandiri (Self-Service Request)
// Jika dibuat oleh role 'user' (client), proyek berstatus PENDING (is_active = false) menunggu persetujuan admin.
// Jika dibuat oleh 'admin', proyek bisa langsung aktif.
export async function createProject(payload, userId = null, userRole = null) {
  const validation = createProjectSchema.safeParse(payload);
  if (!validation.success) {
    throw new AppError('Invalid project creation payload', 400, 'VALIDATION_ERROR', validation.error.errors);
  }

  const { name, slug, description, rateLimitPerMin, dailyQuota, webhookUrl, webhookSecret, isActive } = validation.data;
  const activeStatus = userRole === 'admin' ? (isActive ?? true) : false;

  try {
    const createdProject = await projectRepository.insert({
      name,
      slug: slug.toLowerCase().trim(),
      description,
      rate_limit_per_min: rateLimitPerMin,
      daily_quota: dailyQuota,
      webhook_url: webhookUrl,
      webhook_secret: webhookSecret,
      owner_id: userId,
      is_active: activeStatus
    });

    logger.info({ projectId: createdProject.id, slug: createdProject.slug, ownerId: userId, isActive: activeStatus }, 'Project created/requested');
    writeAuditLog({
      userId,
      action: activeStatus ? 'CREATE_PROJECT' : 'REQUEST_PROJECT',
      targetEntity: 'projects',
      detail: activeStatus ? `Created project '${name}'` : `Requested project access for '${name}' (pending approval)`
    });
    return createdProject;
  } catch (error) {
    if (error.code === '23505') {
      throw new AppError('Project slug already exists', 409, 'SLUG_EXISTS');
    }
    throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
  }
}export async function updateProject(projectId, updateData, userId = null) {
  const validation = updateProjectSchema.safeParse(updateData);
  if (!validation.success) {
    throw new AppError('Invalid project payload', 400, 'VALIDATION_ERROR', validation.error.errors);
  }

  const dbData = {};
  if (validation.data.name !== undefined) dbData.name = validation.data.name;
  if (validation.data.slug !== undefined) dbData.slug = validation.data.slug.toLowerCase().trim();
  if (validation.data.description !== undefined) dbData.description = validation.data.description;
  if (validation.data.rateLimitPerMin !== undefined) dbData.rate_limit_per_min = validation.data.rateLimitPerMin;
  if (validation.data.dailyQuota !== undefined) dbData.daily_quota = validation.data.dailyQuota;
  if (validation.data.webhookUrl !== undefined) dbData.webhook_url = validation.data.webhookUrl;
  if (validation.data.webhookSecret !== undefined) dbData.webhook_secret = validation.data.webhookSecret;
  if (validation.data.isActive !== undefined) dbData.is_active = validation.data.isActive;

  const updatedProject = await projectRepository.updateById(projectId, dbData);
  if (!updatedProject) {
    throw new AppError('Project not found or update failed', 404, 'NOT_FOUND');
  }

  logger.info({ projectId }, 'Project updated');
  writeAuditLog({ userId, action: 'UPDATE_PROJECT', targetEntity: 'projects', detail: `Updated project ID ${projectId}` });
  return updatedProject;
}export async function approveProject(projectId, payload = {}, adminUserId = null) {
  const existingProject = await projectRepository.findByIdWithApiKeys(projectId);
  if (!existingProject) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  const dailyQuota = payload.dailyQuota ? Number(payload.dailyQuota) : (existingProject.daily_quota || 5000);
  const rateLimitPerMin = payload.rateLimitPerMin ? Number(payload.rateLimitPerMin) : (existingProject.rate_limit_per_min || 100);
  const environment = payload.environment || 'production';

  // 1. Update project menjadi aktif dengan kuota yang disetujui
  const updatedProject = await projectRepository.updateById(projectId, {
    is_active: true,
    daily_quota: dailyQuota,
    rate_limit_per_min: rateLimitPerMin
  });

  // 2. Terbitkan API Key awal secara otomatis jika belum ada API Key aktif
  let generatedKey = null;
  const activeKeys = (existingProject.api_keys || []).filter(k => k.is_active);
  if (activeKeys.length === 0) {
    generatedKey = await generateApiKey({
      projectId,
      name: `${updatedProject.name} Initial Key`,
      environment
    }, adminUserId);
  }

  logger.info({ projectId, adminUserId }, 'Project approved and activated');
  writeAuditLog({
    userId: adminUserId,
    action: 'APPROVE_PROJECT',
    targetEntity: 'projects',
    detail: `Admin approved project '${updatedProject.name}' with quota ${dailyQuota}/day`
  });

  return {
    project: updatedProject,
    rawApiKey: generatedKey?.rawApiKey || null,
    apiKeyInfo: generatedKey?.apiKeyInfo || null
  };
}export async function listApiKeys() {
  return await apiKeyRepository.findAll();
}export async function generateApiKey(payload, userId = null) {
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
}export async function regenerateApiKey(keyId, userId = null) {
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
}export async function deactivateApiKey(keyId, userId = null) {
  const deactivatedKey = await apiKeyRepository.updateById(keyId, { is_active: false, revoked_at: new Date().toISOString() }, '*');
  if (!deactivatedKey) {
    throw new AppError('API Key not found', 404, 'NOT_FOUND');
  }

  logger.info({ keyId }, 'API Key deactivated');
  writeAuditLog({ userId, action: 'DEACTIVATE_API_KEY', targetEntity: 'api_keys', detail: `Deactivated key ID ${keyId}` });
  return deactivatedKey;
}export async function updateApiKey(keyId, payload, userId = null) {
  const validation = updateApiKeySchema.safeParse(payload);
  if (!validation.success) {
    throw new AppError('Invalid API key payload', 400, 'VALIDATION_ERROR', validation.error.errors);
  }

  const updatedKey = await apiKeyRepository.updateById(keyId, { name: validation.data.name });
  if (!updatedKey) {
    throw new AppError('API Key not found', 404, 'NOT_FOUND');
  }

  logger.info({ keyId }, 'API Key renamed');
  writeAuditLog({ userId, action: 'UPDATE_API_KEY', targetEntity: 'api_keys', detail: `Renamed key ID ${keyId} to '${validation.data.name}'` });
  return updatedKey;
}export async function deleteApiKey(keyId, userId = null) {
  const existing = await apiKeyRepository.findByIdWithProject(keyId);
  if (!existing) {
    throw new AppError('API Key not found', 404, 'NOT_FOUND');
  }

  await apiKeyRepository.deleteById(keyId);
  logger.info({ keyId }, 'API Key deleted');
  writeAuditLog({ userId, action: 'DELETE_API_KEY', targetEntity: 'api_keys', detail: `Deleted key '${existing.name}' (ID ${keyId})` });
  return { deleted: true };
}export async function deleteProject(projectId, userId = null) {
  const existing = await projectRepository.findSlugAndNameById(projectId);
  if (!existing) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  await projectRepository.deleteById(projectId);
  logger.info({ projectId }, 'Project deleted');
  writeAuditLog({ userId, action: 'DELETE_PROJECT', targetEntity: 'projects', detail: `Deleted project '${existing.name}' (ID ${projectId})` });
  return { deleted: true };
}

export { listTemplates, createTemplate, updateTemplate, deleteTemplate } from './templateService.js';export async function listVendors() {
  const vendors = await vendorRepository.findAllOrderedByPriority();
  return vendors.map(({ credential_encrypted, credential_iv, credential_auth_tag, ...meta }) => meta);
}export async function createVendor(payload, userId = null) {
  const validation = createVendorSchema.safeParse(payload);
  if (!validation.success) {
    throw new AppError('Invalid vendor payload', 400, 'VALIDATION_ERROR', validation.error.errors);
  }

  const { provider, name, channel, credentials, priority } = validation.data;
  const { encryptedData, iv, authTag } = encryptAES(JSON.stringify(credentials));

  const registeredVendor = await vendorRepository.insert({
    name,
    provider,
    channel: channel.toUpperCase(),
    credential_encrypted: encryptedData,
    credential_iv: iv,
    credential_auth_tag: authTag,
    priority
  });

  logger.info({ vendorId: registeredVendor.id, channel: registeredVendor.channel }, 'Vendor registered');
  writeAuditLog({ userId, action: 'CREATE_VENDOR', targetEntity: 'vendors', detail: `Registered vendor '${name}' for channel ${channel}` });
  return registeredVendor;
}export async function updateVendor(vendorId, payload, userId = null) {
  const validation = updateVendorSchema.safeParse(payload);
  if (!validation.success) {
    throw new AppError('Invalid vendor payload', 400, 'VALIDATION_ERROR', validation.error.errors);
  }

  const { name, credentials, priority, is_active } = validation.data;
  const updateData = {};

  if (name !== undefined) updateData.name = name;
  if (priority !== undefined) updateData.priority = priority;
  if (is_active !== undefined) updateData.is_active = is_active;

  // Enkripsi ulang hanya jika admin mengirim credentials baru
  if (credentials !== undefined) {
    const { encryptedData, iv, authTag } = encryptAES(JSON.stringify(credentials));
    updateData.credential_encrypted = encryptedData;
    updateData.credential_iv = iv;
    updateData.credential_auth_tag = authTag;
  }

  const updatedVendor = await vendorRepository.updateById(vendorId, updateData);
  if (!updatedVendor) {
    throw new AppError('Vendor not found', 404, 'NOT_FOUND');
  }

  logger.info({ vendorId }, 'Vendor updated');
  writeAuditLog({ userId, action: 'UPDATE_VENDOR', targetEntity: 'vendors', detail: `Updated vendor ID ${vendorId}${credentials !== undefined ? ' (credentials rotated)' : ''}` });
  return updatedVendor;
}export async function deleteVendor(vendorId, userId = null) {
  const deletedVendor = await vendorRepository.deleteById(vendorId);
  if (!deletedVendor) {
    throw new AppError('Vendor not found', 404, 'NOT_FOUND');
  }

  logger.info({ vendorId }, 'Vendor deleted');
  writeAuditLog({ userId, action: 'DELETE_VENDOR', targetEntity: 'vendors', detail: `Deleted vendor ID ${vendorId}` });
  return deletedVendor;
}
