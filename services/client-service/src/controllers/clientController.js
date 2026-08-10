import * as clientService from '../services/clientService.js';

export async function getProjects(req, res, next) {
  try {
    const data = await clientService.listProjects();
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function getProjectById(req, res, next) {
  try {
    const data = await clientService.getProjectById(req.params.id);
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createProject(req, res, next) {
  try {
    const data = await clientService.createProject(req.body, req.user?.userId);
    return res.status(201).json({ success: true, message: 'Project created successfully', data });
  } catch (err) { next(err); }
}

export async function updateProject(req, res, next) {
  try {
    const data = await clientService.updateProject(req.params.id, req.body, req.user?.userId);
    return res.json({ success: true, message: 'Project updated successfully', data });
  } catch (err) { next(err); }
}

export async function generateApiKey(req, res, next) {
  try {
    const data = await clientService.generateApiKey(req.body, req.user?.userId);
    return res.status(201).json({ success: true, message: 'API Key generated. Save the raw key — it will not be shown again.', data });
  } catch (err) { next(err); }
}

export async function regenerateApiKey(req, res, next) {
  try {
    const data = await clientService.regenerateApiKey(req.params.id, req.user?.userId);
    return res.json({ success: true, message: 'API Key regenerated. Save the raw key — it will not be shown again.', data });
  } catch (err) { next(err); }
}

export async function deactivateApiKey(req, res, next) {
  try {
    const data = await clientService.deactivateApiKey(req.params.id, req.user?.userId);
    return res.json({ success: true, message: 'API Key deactivated successfully', data });
  } catch (err) { next(err); }
}

export async function getTemplates(req, res, next) {
  try {
    const data = await clientService.listTemplates(req.query.projectId);
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createTemplate(req, res, next) {
  try {
    const data = await clientService.createTemplate(req.body, req.user?.userId);
    return res.status(201).json({ success: true, message: 'Template created successfully', data });
  } catch (err) { next(err); }
}

export async function updateTemplateStatus(req, res, next) {
  try {
    const data = await clientService.updateTemplateStatus(req.params.id, req.body, req.user?.userId);
    return res.json({ success: true, message: `Template ${req.body.status} successfully`, data });
  } catch (err) { next(err); }
}

export async function getVendors(req, res, next) {
  try {
    const data = await clientService.listVendors();
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

export async function createVendor(req, res, next) {
  try {
    const data = await clientService.createVendor(req.body, req.user?.userId);
    return res.status(201).json({ success: true, message: 'Vendor registered successfully', data });
  } catch (err) { next(err); }
}
