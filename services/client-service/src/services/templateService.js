import { writeAuditLog } from '@notification-gateway/database';
import { createTemplateSchema, updateTemplateSchema } from '@notification-gateway/shared';
import { AppError } from '../middlewares/errorHandler.js';
import * as templates from '../repositories/templateRepository.js';
import * as projects from '../repositories/projectRepository.js';

async function assertProjectAccess(projectId, userId, role) {
  if (!userId) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  const project = await projects.findOwnershipById(projectId);
  if (!project || (role !== 'admin' && project.owner_id !== userId)) {
    throw new AppError('Project not found or access forbidden', 403, 'FORBIDDEN');
  }
}

async function accessibleTemplate(id, userId, role) {
  const template = await templates.findById(id);
  if (!template) throw new AppError('Template not found', 404, 'NOT_FOUND');
  await assertProjectAccess(template.project_id, userId, role);
  return template;
}

export async function listTemplates(projectId = null, userId = null, role = 'user') {
  if (!userId) throw new AppError('Authentication required', 401, 'UNAUTHORIZED');
  if (projectId) await assertProjectAccess(projectId, userId, role);
  return templates.findAll(projectId, role === 'admin' ? null : userId);
}

export async function createTemplate(payload, userId = null, role = 'user') {
  const parsed = createTemplateSchema.safeParse(payload);
  if (!parsed.success) throw new AppError('Invalid template payload', 400, 'VALIDATION_ERROR', parsed.error.errors);
  const { projectId, name, code, channel, subject, body, variables } = parsed.data;
  await assertProjectAccess(projectId, userId, role);
  let template;
  try {
    template = await templates.insert({ project_id: projectId, name, code: code.toLowerCase().trim(),
      channel, subject, body, variables: variables || [] });
  } catch (error) {
    if (error.code === '23505') throw new AppError('Template code already exists', 409, 'TEMPLATE_CODE_EXISTS');
    throw error;
  }
  writeAuditLog({ userId, action: 'CREATE_TEMPLATE', targetEntity: 'templates', detail: `Created template ${template.id}` });
  return template;
}

export async function updateTemplate(id, payload, userId = null, role = 'user') {
  const parsed = updateTemplateSchema.safeParse(payload);
  if (!parsed.success || !Object.keys(parsed.data).length) {
    throw new AppError('Invalid template payload', 400, 'VALIDATION_ERROR');
  }
  const existing = await accessibleTemplate(id, userId, role);
  const updated = await templates.updateById(id, parsed.data, existing.updated_at);
  if (!updated) throw new AppError('Template changed. Refresh and try again.', 409, 'TEMPLATE_UPDATE_CONFLICT');
  writeAuditLog({ userId, action: 'UPDATE_TEMPLATE', targetEntity: 'templates', detail: `Updated template ${id}` });
  return updated;
}

export async function deleteTemplate(id, userId = null, role = 'user') {
  await accessibleTemplate(id, userId, role);
  await templates.deleteById(id);
  writeAuditLog({ userId, action: 'DELETE_TEMPLATE', targetEntity: 'templates', detail: `Deleted template ${id}` });
  return { deleted: true };
}

