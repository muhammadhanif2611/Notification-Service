import { supabase, writeAuditLog } from '@notification-gateway/database';
import {
  generateRawApiKey,
  hashApiKey,
  createProjectSchema,
  createApiKeySchema,
  createTemplateSchema
} from '@notification-gateway/shared';
import { AppError } from '../middlewares/errorHandler.js';

export class ClientService {
  // =========================================================================
  // 1. PROJECTS MANAGEMENT
  // =========================================================================

  static async listProjects() {
    const { data: projects, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
    return projects;
  }

  static async getProjectById(projectId) {
    const { data: project, error } = await supabase
      .from('projects')
      .select('*, api_keys(id, name, key_prefix, environment, last_used_at, is_active, created_at)')
      .eq('id', projectId)
      .maybeSingle();

    if (error || !project) throw new AppError('Project not found', 404, 'NOT_FOUND');
    return project;
  }

  static async createProject(payload, userId = null) {
    const parse = createProjectSchema.safeParse(payload);
    if (!parse.success) {
      throw new AppError('Invalid project creation payload', 400, 'VALIDATION_ERROR', parse.error.errors);
    }

    const { data: newProject, error } = await supabase
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

    writeAuditLog({
      userId,
      action: 'CREATE_PROJECT',
      targetEntity: 'projects',
      detail: `Created project '${parse.data.name}' (${parse.data.slug})`
    });

    return newProject;
  }

  static async updateProject(projectId, updateData, userId = null) {
    const { data: updated, error } = await supabase
      .from('projects')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .select()
      .single();

    if (error) throw new AppError(`Failed to update project: ${error.message}`, 500, 'DATABASE_ERROR');

    writeAuditLog({
      userId,
      action: 'UPDATE_PROJECT',
      targetEntity: 'projects',
      detail: `Updated settings for project ID ${projectId}`
    });

    return updated;
  }

  // =========================================================================
  // 2. API KEYS HASHING & MANAGEMENT
  // =========================================================================

  static async generateApiKey(payload, userId = null) {
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
    const keyHash = await hashApiKey(rawKey);
    const prefix = envPrefix === 'prod' ? 'ngw_prod_' : 'ngw_sand_';

    const { data: keyRecord, error } = await supabase
      .from('api_keys')
      .insert({
        project_id: parse.data.projectId,
        name: parse.data.name,
        key_prefix: prefix,
        key_hash: keyHash,
        environment: parse.data.environment
      })
      .select('id, project_id, name, key_prefix, environment, is_active, created_at')
      .single();

    if (error) throw new AppError(`Failed to generate API Key: ${error.message}`, 500, 'DATABASE_ERROR');

    writeAuditLog({
      userId,
      action: 'GENERATE_API_KEY',
      targetEntity: 'api_keys',
      detail: `Generated API Key '${parse.data.name}' for project '${project.name}'`
    });

    return {
      rawApiKey: rawKey, // Shown ONLY ONCE upon creation
      apiKeyInfo: keyRecord
    };
  }

  static async regenerateApiKey(keyId, userId = null) {
    const { data: existingKey } = await supabase
      .from('api_keys')
      .select('*, projects(slug, name)')
      .eq('id', keyId)
      .single();

    if (!existingKey) throw new AppError('API Key record not found', 404, 'NOT_FOUND');

    const envPrefix = existingKey.environment === 'production' ? 'prod' : 'sand';
    const rawKey = generateRawApiKey(envPrefix, existingKey.projects.slug);
    const keyHash = await hashApiKey(rawKey);

    const { data: updatedKey, error } = await supabase
      .from('api_keys')
      .update({
        key_hash: keyHash,
        last_used_at: null,
        is_active: true
      })
      .eq('id', keyId)
      .select('id, name, key_prefix, environment, is_active, created_at')
      .single();

    if (error) throw new AppError(`Failed to regenerate API Key: ${error.message}`, 500, 'DATABASE_ERROR');

    writeAuditLog({
      userId,
      action: 'REGENERATE_API_KEY',
      targetEntity: 'api_keys',
      detail: `Regenerated API Key '${existingKey.name}' for project '${existingKey.projects.name}'`
    });

    return {
      rawApiKey: rawKey, // Shown ONLY ONCE upon regeneration
      apiKeyInfo: updatedKey
    };
  }

  static async deactivateApiKey(keyId, userId = null) {
    const { data: deactivated, error } = await supabase
      .from('api_keys')
      .update({ is_active: false })
      .eq('id', keyId)
      .select()
      .single();

    if (error) throw new AppError(`Failed to deactivate API Key: ${error.message}`, 500, 'DATABASE_ERROR');

    writeAuditLog({
      userId,
      action: 'DEACTIVATE_API_KEY',
      targetEntity: 'api_keys',
      detail: `Deactivated API Key ID ${keyId}`
    });

    return deactivated;
  }

  // =========================================================================
  // 3. TEMPLATES CATALOG MANAGEMENT
  // =========================================================================

  static async listTemplates(projectId = null) {
    let query = supabase.from('templates').select('*, projects(name)');
    if (projectId) query = query.eq('project_id', projectId);

    const { data: templates, error } = await query;
    if (error) throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
    return templates;
  }

  static async createTemplate(payload, userId = null) {
    const parse = createTemplateSchema.safeParse(payload);
    if (!parse.success) {
      throw new AppError('Invalid template creation payload', 400, 'VALIDATION_ERROR', parse.error.errors);
    }

    const { data: template, error } = await supabase
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

    writeAuditLog({
      userId,
      action: 'CREATE_TEMPLATE',
      targetEntity: 'templates',
      detail: `Created message template '${parse.data.name}' (${parse.data.code})`
    });

    return template;
  }

  static async updateTemplateStatus(templateId, { status, rejectionReason }, userId = null) {
    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new AppError("Status must be 'APPROVED' or 'REJECTED'", 400, 'INVALID_STATUS');
    }

    const { data: updated, error } = await supabase
      .from('templates')
      .update({
        status,
        rejection_reason: status === 'REJECTED' ? rejectionReason : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) throw new AppError(`Failed to update template status: ${error.message}`, 500, 'DATABASE_ERROR');

    writeAuditLog({
      userId,
      action: `TEMPLATE_${status}`,
      targetEntity: 'templates',
      detail: `Set template ID ${templateId} status to ${status}`
    });

    return updated;
  }

  // =========================================================================
  // 4. VENDORS CREDENTIALS MANAGEMENT
  // =========================================================================

  static async listVendors() {
    const { data: vendors, error } = await supabase.from('vendors').select('*').order('priority', { ascending: true });
    if (error) throw new AppError(`Database error: ${error.message}`, 500, 'DATABASE_ERROR');
    return vendors;
  }

  static async createVendor(payload, userId = null) {
    const { name, channel, credentials, priority = 1 } = payload;
    if (!name || !channel || !credentials) {
      throw new AppError('Name, channel, and credentials are required', 400, 'VALIDATION_ERROR');
    }

    const { data: vendor, error } = await supabase
      .from('vendors')
      .insert({
        name,
        channel: channel.toUpperCase(),
        credentials,
        priority
      })
      .select()
      .single();

    if (error) throw new AppError(`Failed to register vendor: ${error.message}`, 500, 'DATABASE_ERROR');

    writeAuditLog({
      userId,
      action: 'CREATE_VENDOR',
      targetEntity: 'vendors',
      detail: `Registered vendor '${name}' for channel ${channel}`
    });

    return vendor;
  }
}
