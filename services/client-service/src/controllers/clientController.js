import * as clientService from '../services/clientService.js';

// Controller: mengambil daftar semua project
export async function getProjects(req, res, next) {
  try {
    const data = await clientService.listProjects();
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

// Controller: mengambil detail project by ID
export async function getProjectById(req, res, next) {
  try {
    const data = await clientService.getProjectById(req.params.id);
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

// Controller: membuat project baru
export async function createProject(req, res, next) {
  try {
    const data = await clientService.createProject(req.body, req.user?.userId);
    return res.status(201).json({ success: true, message: 'Project created successfully', data });
  } catch (err) { next(err); }
}

// Controller: memperbarui data project
export async function updateProject(req, res, next) {
  try {
    const data = await clientService.updateProject(req.params.id, req.body, req.user?.userId);
    return res.json({ success: true, message: 'Project updated successfully', data });
  } catch (err) { next(err); }
}

// Controller: menghapus project beserta data terkait
export async function deleteProject(req, res, next) {
  try {
    const data = await clientService.deleteProject(req.params.id, req.user?.userId);
    return res.json({ success: true, message: 'Project deleted successfully', data });
  } catch (err) { next(err); }
}

// Controller: mengambil daftar semua API Key
export async function listApiKeys(req, res, next) {
  try {
    const data = await clientService.listApiKeys();
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

// Controller: membuat API Key baru
export async function generateApiKey(req, res, next) {
  try {
    const data = await clientService.generateApiKey(req.body, req.user?.userId);
    return res.status(201).json({ success: true, message: 'API Key generated. Save the raw key — it will not be shown again.', data });
  } catch (err) { next(err); }
}

// Controller: meregenerasi API Key
export async function regenerateApiKey(req, res, next) {
  try {
    const data = await clientService.regenerateApiKey(req.params.id, req.user?.userId);
    return res.json({ success: true, message: 'API Key regenerated. Save the raw key — it will not be shown again.', data });
  } catch (err) { next(err); }
}

// Controller: menonaktifkan API Key
export async function deactivateApiKey(req, res, next) {
  try {
    const data = await clientService.deactivateApiKey(req.params.id, req.user?.userId);
    return res.json({ success: true, message: 'API Key deactivated successfully', data });
  } catch (err) { next(err); }
}

// Controller: mengganti nama/label API Key
export async function updateApiKey(req, res, next) {
  try {
    const data = await clientService.updateApiKey(req.params.id, req.body, req.user?.userId);
    return res.json({ success: true, message: 'API Key updated successfully', data });
  } catch (err) { next(err); }
}

// Controller: menghapus API Key secara permanen
export async function deleteApiKey(req, res, next) {
  try {
    const data = await clientService.deleteApiKey(req.params.id, req.user?.userId);
    return res.json({ success: true, message: 'API Key deleted successfully', data });
  } catch (err) { next(err); }
}

// Controller: mengambil daftar template
export async function getTemplates(req, res, next) {
  try {
    const data = await clientService.listTemplates(req.query.projectId);
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

// Controller: membuat template baru
export async function createTemplate(req, res, next) {
  try {
    const data = await clientService.createTemplate(req.body, req.user?.userId);
    return res.status(201).json({ success: true, message: 'Template created successfully', data });
  } catch (err) { next(err); }
}

// Controller: memperbarui status template
export async function updateTemplateStatus(req, res, next) {
  try {
    const data = await clientService.updateTemplateStatus(req.params.id, req.body, req.user?.userId);
    return res.json({ success: true, message: `Template ${req.body.status} successfully`, data });
  } catch (err) { next(err); }
}

// Controller: mengedit isi template
export async function updateTemplate(req, res, next) {
  try {
    const data = await clientService.updateTemplate(req.params.id, req.body, req.user?.userId);
    return res.json({ success: true, message: 'Template updated successfully', data });
  } catch (err) { next(err); }
}

// Controller: menghapus template
export async function deleteTemplate(req, res, next) {
  try {
    const data = await clientService.deleteTemplate(req.params.id, req.user?.userId);
    return res.json({ success: true, message: 'Template deleted successfully', data });
  } catch (err) { next(err); }
}

// Controller: mengambil daftar vendor
export async function getVendors(req, res, next) {
  try {
    const data = await clientService.listVendors();
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

// Controller: mendaftarkan vendor baru
export async function createVendor(req, res, next) {
  try {
    const data = await clientService.createVendor(req.body, req.user?.userId);
    return res.status(201).json({ success: true, message: 'Vendor registered successfully', data });
  } catch (err) { next(err); }
}

// Controller: mengambil status sesi WhatsApp (Baileys) — termasuk QR string saat pairing
export async function getWhatsAppSession(req, res, next) {
  try {
    const data = clientService.getWhatsAppSessionStatus();
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}

// Controller: reset sesi WhatsApp (logout + hapus auth state + generate QR baru)
export async function resetWhatsAppSession(req, res, next) {
  try {
    const data = await clientService.resetWhatsAppSession(req.user?.userId);
    return res.json({ success: true, message: 'WhatsApp session reset. Scan the new QR code.', data });
  } catch (err) { next(err); }
}
