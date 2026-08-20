import express from 'express';
import * as authController from '../controllers/authController.js';

/**
 * Routes untuk authentication dan user management.
 * Base path: /auth
 */
const router = express.Router();

// Authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// User management routes (admin only)
router.get('/users', authController.listUsers);
router.post('/users', authController.createUser);
router.put('/users/:id/status', authController.setUserStatus);
router.put('/users/:id', authController.updateUser);
router.delete('/users/:id', authController.deleteUser);

export default router;
