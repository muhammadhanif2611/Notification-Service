import express from 'express';
import * as clientController from '../controllers/clientController.js';

const router = express.Router();

// Projects
router.get('/projects', clientController.getProjects);
router.get('/projects/:id', clientController.getProjectById);
router.post('/projects', clientController.createProject);
router.put('/projects/:id', clientController.updateProject);

// API Keys
router.post('/api-keys', clientController.generateApiKey);
router.post('/api-keys/:id/regenerate', clientController.regenerateApiKey);
router.put('/api-keys/:id/deactivate', clientController.deactivateApiKey);

// Templates
router.get('/templates', clientController.getTemplates);
router.post('/templates', clientController.createTemplate);
router.put('/templates/:id/status', clientController.updateTemplateStatus);

// Vendors
router.get('/vendors', clientController.getVendors);
router.post('/vendors', clientController.createVendor);

export default router;
