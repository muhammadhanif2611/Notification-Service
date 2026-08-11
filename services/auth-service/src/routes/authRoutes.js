import express from 'express';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// Rute autentikasi registrasi user
router.post('/register', authController.register);

// Rute autentikasi login user
router.post('/login', authController.login);

export default router;
