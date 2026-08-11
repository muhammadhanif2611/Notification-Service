import express from 'express';
import * as notificationController from '../controllers/notificationController.js';

const router = express.Router();

// Rute memproses pengiriman satu notifikasi
router.post('/process', notificationController.process);

// Rute memproses pengiriman notifikasi masal (broadcast)
router.post('/broadcast', notificationController.broadcast);

// Rute mengambil daftar log notifikasi per project
router.get('/logs/:projectId', notificationController.getLogs);

// Rute mengambil detail notifikasi berdasarkan message ID
router.get('/:messageId', notificationController.getByMessageId);

export default router;
