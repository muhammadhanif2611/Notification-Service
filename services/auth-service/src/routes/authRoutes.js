import express from 'express';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// Rute autentikasi registrasi user
router.post('/register', authController.register);

// Rute autentikasi login user
router.post('/login', authController.login);

// Rute manajemen user oleh admin
router.get('/users', authController.listUsers);
router.post('/users', authController.createUser);
router.put('/users/:id/status', authController.setUserStatus);
router.delete('/users/:id', authController.deleteUser);

export default router;
