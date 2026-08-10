import { supabase, writeAuditLog } from '@notification-gateway/database';
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

const logger = createLogger('client-service');

export async function listProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
  return data;
}

export async function getProjectById(projectId) {
  const { data, error } = await supabase
    .from('projects')
    .select('*, api_keys(id, name, key_prefix, key_preview, environment, last_used_at, is_active, created_at)')
    .eq('id', projectId)
    .maybeSingle();
  if (error || !data) throw new AppError('Project not found', 404, 'NOT_FOUND');
  return data;
}

export async function createProject(payload, userId = null) {
  const parse = createProjectSchema.safeParse(payload);
  if (!parse.success) {
    throw new AppError('Invalid project creation payload', 400, 'VALIDATION_ERROR', parse.error.errors);
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: parse.data.name,
      slug: parse.data.slug.toLowerCase().trim(),
      description: parse.data.description,
      rate_limit_per_min: parse.data.rateLimitPerMin,
      daily_quota: parse.data.dailyQuota,
      webhook_url: parse.data.webhookUrl,
      webhook_secret: parse.data.webhookSecret
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new AppError('Project slug already exists', 409, 'SLUG_EXISTS');
    throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
  }

  logger.info({ projectId: data.id, slug: data.slug }, 'Project created');
  writeAuditLog({ userId, action: 'CREATE_PROJECT', targetEntity: 'projects', detail: `Created project '${parse.data.name}'` });
  return data;
}

export async function updateProject(projectId, updateData, userId = null) {
  const { data, error } = await supabase
    .from('projects')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', projectId)
    .select()
    .single();
  if (error) throw new AppError(`Failed to update project: ${error.message}`, 500, 'DATABASE_ERROR');

  logger.info({ projectId }, 'Project updated');
  writeAuditLog({ userId, action: 'UPDATE_PROJECT', targetEntity: 'projects', detail: `Updated project ID ${projectId}` });
  return data;
}

/**
 * Raw key ditampilkan SEKALI SAJA — tidak pernah disimpan plain.
 * key_preview: 8 karakter terakhir untuk tampilan dashboard.
 */
export async function generateApiKey(payload, userId = null) {
  const parse = createApiKeySchema.safeParse(payload);
  if (!parse.success) {
    throw new AppError('Invalid API key payload', 400, 'VALIDATION_ERROR', parse.error.errors);
  }

  const { data: project } = await supabase
    .from('projects')
    .select('slug, name')
    .eq('id', parse.data.projectId)
    .single();
  if (!project) throw new AppError('Associated project not found', 404, 'NOT_FOUND');

  const envPrefix = parse.data.environment === 'production' ? 'prod' : 'sand';
  const rawKey = generateRawApiKey(envPrefix, project.slug);
  const [keyHash, keyPreview, keyPrefix] = [
    await hashApiKey(rawKey),
    extractKeyPreview(rawKey),
    envPrefix === 'prod' ? 'ngw_prod_' : 'ngw_sand_'
  ];

  const { data, error } = await supabase
    .from('api_keys')
    .insert({ project_id: parse.data.projectId, name: parse.data.name, key_prefix: keyPrefix, key_hash: keyHash, key_preview: keyPreview, environment: parse.data.environment })
    .select('id, project_id, name, key_prefix, key_preview, environment, is_active, created_at')
    .single();
  if (error) throw new AppError(`Failed to generate API Key: ${error.message}`, 500, 'DATABASE_ERROR');

  logger.info({ keyId: data.id, projectId: parse.data.projectId }, 'API Key generated');
  writeAuditLog({ userId, action: 'GENERATE_API_KEY', targetEntity: 'api_keys', detail: `Generated key '${parse.data.name}' for project '${project.name}'` });
  return { rawApiKey: rawKey, apiKeyInfo: data };
}

export async function regenerateApiKey(keyId, userId = null) {
  const { data: existing } = await supabase
    .from('api_keys')
    .select('*, projects(slug, name)')
    .eq('id', keyId)
    .single();
  if (!existing) throw new AppError('API Key not found', 404, 'NOT_FOUND');

  const envPrefix = existing.environment === 'production' ? 'prod' : 'sand';
  const rawKey = generateRawApiKey(envPrefix, existing.projects.slug);
  const keyHash = await hashApiKey(rawKey);
  const keyPreview = extractKeyPreview(rawKey);

  const { data, error } = await supabase
    .from('api_keys')
    .update({ key_hash: keyHash, key_preview: keyPreview, last_used_at: null, is_active: true })
    .eq('id', keyId)
    .select('id, name, key_prefix, key_preview, environment, is_active, created_at')
    .single();
  if (error) throw new AppError(`Failed to regenerate API Key: ${error.message}`, 500, 'DATABASE_ERROR');

  logger.info({ keyId }, 'API Key regenerated');
  writeAuditLog({ userId, action: 'REGENERATE_API_KEY', targetEntity: 'api_keys', detail: `Regenerated key '${existing.name}'` });
  return { rawApiKey: rawKey, apiKeyInfo: data };
}

export async function deactivateApiKey(keyId, userId = null) {
  const { data, error } = await supabase
    .from('api_keys')
    .update({ is_active: false })
    .eq('id', keyId)
    .select()
    .single();
  if (error) throw new AppError(`Failed to deactivate API Key: ${error.message}`, 500, 'DATABASE_ERROR');

  logger.info({ keyId }, 'API Key deactivated');
  writeAuditLog({ userId, action: 'DEACTIVATE_API_KEY', targetEntity: 'api_keys', detail: `Deactivated key ID ${keyId}` });
  return data;
}

export async function listTemplates(projectId = null) {
  let query = supabase.from('templates').select('*, projects(name)');
  if (projectId) query = query.eq('project_id', projectId);
  const { data, error } = await query;
  if (error) throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
  return data;
}

export async function createTemplate(payload, userId = null) {
  const parse = createTemplateSchema.safeParse(payload);
  if (!parse.success) {
    throw new AppError('Invalid template payload', 400, 'VALIDATION_ERROR', parse.error.errors);
  }

  const { data, error } = await supabase
    .from('templates')
    .insert({
      project_id: parse.data.projectId,
      name: parse.data.name,
      code: parse.data.code.toLowerCase().trim(),
      channel: parse.data.channel.toUpperCase(),
      subject: parse.data.subject,
      body: parse.data.body,
      variables: parse.data.variables || [],
      status: 'PENDING'
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') throw new AppError('Template code already exists', 409, 'TEMPLATE_CODE_EXISTS');
    throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
  }

  logger.info({ templateId: data.id, code: data.code }, 'Template created');
  writeAuditLog({ userId, action: 'CREATE_TEMPLATE', targetEntity: 'templates', detail: `Created template '${parse.data.name}'` });
  return data;
}

export async function updateTemplateStatus(templateId, { status, rejectionReason }, userId = null) {
  const VALID_STATUSES = ['APPROVED', 'REJECTED'];
  if (!VALID_STATUSES.includes(status)) {
    throw new AppError("Status must be 'APPROVED' or 'REJECTED'", 400, 'INVALID_STATUS');
  }

  const { data, error } = await supabase
    .from('templates')
    .update({ status, rejection_reason: status === 'REJECTED' ? rejectionReason : null, updated_at: new Date().toISOString() })
    .eq('id', templateId)
    .select()
    .single();
  if (error) throw new AppError(`Failed to update template status: ${error.message}`, 500, 'DATABASE_ERROR');

  logger.info({ templateId, status }, 'Template status updated');
  writeAuditLog({ userId, action: `TEMPLATE_${status}`, targetEntity: 'templates', detail: `Template ID ${templateId} set to ${status}` });
  return data;
}

/** Credentials tidak pernah dikembalikan — hanya metadata. */
export async function listVendors() {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, channel, priority, is_active, created_at')
    .order('priority', { ascending: true });
  if (error) throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
  return data;
}

/** Credentials dienkripsi AES-256-GCM sebelum disimpan ke DB. */
export async function createVendor(payload, userId = null) {
  const { name, channel, credentials, priority = 1 } = payload;
  if (!name || !channel || !credentials) {
    throw new AppError('Name, channel, and credentials are required', 400, 'VALIDATION_ERROR');
  }

  const { encryptedData, iv, authTag } = encryptAES(JSON.stringify(credentials));

  const { data, error } = await supabase
    .from('vendors')
    .insert({ name, channel: channel.toUpperCase(), credential_encrypted: encryptedData, credential_iv: iv, credential_auth_tag: authTag, priority })
    .select('id, name, channel, priority, is_active, created_at')
    .single();
  if (error) throw new AppError(`Failed to register vendor: ${error.message}`, 500, 'DATABASE_ERROR');

  logger.info({ vendorId: data.id, channel: data.channel }, 'Vendor registered');
  writeAuditLog({ userId, action: 'CREATE_VENDOR', targetEntity: 'vendors', detail: `Registered vendor '${name}' for channel ${channel}` });
  return data;
}
