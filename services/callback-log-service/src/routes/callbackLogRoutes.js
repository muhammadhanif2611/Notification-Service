import express from 'express';
import * as callbackLogController from '../controllers/callbackLogController.js';

const router = express.Router();

// Rute untuk mengambil log notifikasi
router.get('/logs', callbackLogController.getLogs);

// Rute untuk mengambil statistik notifikasi
router.get('/statistics', callbackLogController.getStatistics);

export default router;
