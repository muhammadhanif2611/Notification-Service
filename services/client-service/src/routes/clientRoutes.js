import express from 'express';
import * as clientController from '../controllers/clientController.js';

const router = express.Router();

// Rute manajemen project
router.get('/projects', clientController.getProjects);
router.get('/projects/:id', clientController.getProjectById);
router.post('/projects', clientController.createProject);
router.put('/projects/:id', clientController.updateProject);
router.delete('/projects/:id', clientController.deleteProject);

// Rute manajemen API Key
router.get('/api-keys', clientController.listApiKeys);
router.post('/api-keys', clientController.generateApiKey);
router.post('/api-keys/:id/regenerate', clientController.regenerateApiKey);
router.put('/api-keys/:id/deactivate', clientController.deactivateApiKey);
router.put('/api-keys/:id', clientController.updateApiKey);
router.delete('/api-keys/:id', clientController.deleteApiKey);

// Rute manajemen template pesan
router.get('/templates', clientController.getTemplates);
router.post('/templates', clientController.createTemplate);
router.put('/templates/:id', clientController.updateTemplate);
router.delete('/templates/:id', clientController.deleteTemplate);

// Rute manajemen vendor provider
router.get('/vendors', clientController.getVendors);
router.post('/vendors', clientController.createVendor);

export default router;
