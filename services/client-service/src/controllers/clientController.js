import { ClientService } from '../services/clientService.js';

export class ClientController {
  // Projects
  static async getProjects(req, res, next) {
    try {
      const data = await ClientService.listProjects();
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async getProjectById(req, res, next) {
    try {
      const data = await ClientService.getProjectById(req.params.id);
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createProject(req, res, next) {
    try {
      const data = await ClientService.createProject(req.body, req.user?.userId);
      return res.status(201).json({ success: true, message: 'Project created successfully', data });
    } catch (err) {
      next(err);
    }
  }

  static async updateProject(req, res, next) {
    try {
      const data = await ClientService.updateProject(req.params.id, req.body, req.user?.userId);
      return res.json({ success: true, message: 'Project updated successfully', data });
    } catch (err) {
      next(err);
    }
  }

  // API Keys
  static async generateApiKey(req, res, next) {
    try {
      const data = await ClientService.generateApiKey(req.body, req.user?.userId);
      return res.status(201).json({ success: true, message: 'API Key generated successfully', data });
    } catch (err) {
      next(err);
    }
  }

  static async regenerateApiKey(req, res, next) {
    try {
      const data = await ClientService.regenerateApiKey(req.params.id, req.user?.userId);
      return res.json({ success: true, message: 'API Key regenerated successfully', data });
    } catch (err) {
      next(err);
    }
  }

  static async deactivateApiKey(req, res, next) {
    try {
      const data = await ClientService.deactivateApiKey(req.params.id, req.user?.userId);
      return res.json({ success: true, message: 'API Key deactivated successfully', data });
    } catch (err) {
      next(err);
    }
  }

  // Templates
  static async getTemplates(req, res, next) {
    try {
      const data = await ClientService.listTemplates(req.query.projectId);
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createTemplate(req, res, next) {
    try {
      const data = await ClientService.createTemplate(req.body, req.user?.userId);
      return res.status(201).json({ success: true, message: 'Template created successfully', data });
    } catch (err) {
      next(err);
    }
  }

  static async updateTemplateStatus(req, res, next) {
    try {
      const data = await ClientService.updateTemplateStatus(req.params.id, req.body, req.user?.userId);
      return res.json({ success: true, message: `Template ${req.body.status} successfully`, data });
    } catch (err) {
      next(err);
    }
  }

  // Vendors
  static async getVendors(req, res, next) {
    try {
      const data = await ClientService.listVendors();
      return res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  static async createVendor(req, res, next) {
    try {
      const data = await ClientService.createVendor(req.body, req.user?.userId);
      return res.status(201).json({ success: true, message: 'Vendor registered successfully', data });
    } catch (err) {
      next(err);
    }
  }
}
