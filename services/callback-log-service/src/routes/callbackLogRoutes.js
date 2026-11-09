import express from 'express';
import * as callbackLogController from '../controllers/callbackLogController.js';
import * as suppressionController from '../controllers/suppressionController.js';

const router = express.Router();

// Rute riwayat log notifikasi, statistik pengiriman, dan suppression list.
router.get('/logs', callbackLogController.getLogs);
router.get('/statistics', callbackLogController.getStatistics);

router.get('/suppressions', suppressionController.listSuppressions);
router.post('/suppressions', suppressionController.createSuppression);
router.delete('/suppressions/:id', suppressionController.deleteSuppression);

export default router;
