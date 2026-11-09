import express from 'express';
import * as notificationController from '../controllers/notificationController.js';

const router = express.Router();

// Rute pemrosesan pengiriman tunggal dan broadcast massal.
router.post('/process', notificationController.process);
router.post('/broadcast', notificationController.broadcast);

export default router;
