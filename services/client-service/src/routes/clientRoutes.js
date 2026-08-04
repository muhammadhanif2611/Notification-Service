import express from 'express';
import { ClientController } from '../controllers/clientController.js';

const router = express.Router();

// Projects Routes
router.get('/projects', ClientController.getProjects);
router.get('/projects/:id', ClientController.getProjectById);
router.post('/projects', ClientController.createProject);
router.put('/projects/:id', ClientController.updateProject);

// API Keys Routes
router.post('/api-keys', ClientController.generateApiKey);
router.post('/api-keys/:id/regenerate', ClientController.regenerateApiKey);
router.put('/api-keys/:id/deactivate', ClientController.deactivateApiKey);

// Templates Routes
router.get('/templates', ClientController.getTemplates);
router.post('/templates', ClientController.createTemplate);
router.put('/templates/:id/status', ClientController.updateTemplateStatus);

// Vendors Routes
router.get('/vendors', ClientController.getVendors);
router.post('/vendors', ClientController.createVendor);

export default router;
