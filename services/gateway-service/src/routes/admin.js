import express from 'express';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

// Rute autentikasi login admin
router.post('/auth/login', adminController.login);

// Rute manajemen project admin
router.get('/projects', adminController.getProjects);
router.post('/projects', adminController.createProject);

// Rute pembuatan API Key admin
router.post('/api-keys', adminController.generateApiKey);

export default router;
