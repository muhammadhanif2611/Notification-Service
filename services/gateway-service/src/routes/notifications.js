import express from 'express';
import * as notificationController from '../controllers/notificationController.js';

const router = express.Router();

// Rute pengiriman notifikasi
router.post('/send', notificationController.sendNotification);

export default router;
