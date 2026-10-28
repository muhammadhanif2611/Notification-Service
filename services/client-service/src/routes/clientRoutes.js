import express from 'express';
import * as clientController from '../controllers/clientController.js';
import * as adminClientController from '../controllers/adminClientController.js';
import * as adminDomainController from '../controllers/adminDomainController.js';

const router = express.Router();router.get('/projects', clientController.getProjects);
router.get('/projects/:id', clientController.getProjectById);
router.post('/projects', clientController.createProject);
router.post('/projects/:id/approve', clientController.approveProject);
router.put('/projects/:id', clientController.updateProject);
router.delete('/projects/:id', clientController.deleteProject);router.get('/api-keys', clientController.listApiKeys);
router.post('/api-keys', clientController.generateApiKey);
router.post('/api-keys/:id/regenerate', clientController.regenerateApiKey);
router.put('/api-keys/:id/deactivate', clientController.deactivateApiKey);
router.put('/api-keys/:id', clientController.updateApiKey);
router.delete('/api-keys/:id', clientController.deleteApiKey);router.get('/templates', clientController.getTemplates);
router.post('/templates', clientController.createTemplate);
router.put('/templates/:id', clientController.updateTemplate);
router.delete('/templates/:id', clientController.deleteTemplate);

router.get('/admin/clients', adminClientController.listClients);
router.get('/admin/clients/:id', adminClientController.getClientDetails);router.get('/vendors', clientController.getVendors);
router.post('/vendors', clientController.createVendor);
router.put('/vendors/:id', clientController.updateVendor);
router.delete('/vendors/:id', clientController.deleteVendor);

// Admin: Domain & MTA (verifikasi DNS dinamis + manajemen IP pool)
router.get('/admin/mta/domains', adminDomainController.getDomainOverview);
router.post('/admin/mta/domains/:id/verify', adminDomainController.verifyDomain);
router.get('/admin/mta/ip-pools', adminDomainController.listIpPools);
router.post('/admin/mta/ip-pools', adminDomainController.createIpPool);
router.delete('/admin/mta/ip-pools/:id', adminDomainController.deleteIpPool);

// Client: cek kesehatan endpoint webhook project
router.get('/projects/:projectId/webhook-health', adminDomainController.checkWebhookHealth);

export default router;
