import express from 'express';
import * as callbackLogController from '../controllers/callbackLogController.js';
import * as suppressionController from '../controllers/suppressionController.js';
import * as alertController from '../controllers/alertController.js';

const router = express.Router();

// Rute untuk mengambil log notifikasi
router.get('/logs', callbackLogController.getLogs);

// Rute untuk mengambil statistik notifikasi
router.get('/statistics', callbackLogController.getStatistics);

// Rute untuk menerima status pengiriman dari provider (WhatsApp & Email)
router.post('/webhook/:provider', callbackLogController.receiveProviderWebhook);

// Suppression List (admin)
router.get('/suppressions', suppressionController.listSuppressions);
router.post('/suppressions', suppressionController.createSuppression);
router.delete('/suppressions/:id', suppressionController.deleteSuppression);

// Threshold Alert (admin)
router.get('/alert-rules', alertController.listAlertRules);
router.post('/alert-rules', alertController.createAlertRule);
router.put('/alert-rules/:id', alertController.updateAlertRule);
router.delete('/alert-rules/:id', alertController.deleteAlertRule);
router.get('/alert-history', alertController.listAlertHistory);
router.post('/alert-history/:id/resolve', alertController.resolveAlertHistoryEntry);

export default router;
