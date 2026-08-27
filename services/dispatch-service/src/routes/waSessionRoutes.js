import express from 'express';
import * as waSessionController from '../controllers/waSessionController.js';

const router = express.Router();

// Rute client: kelola sesi WhatsApp milik project sendiri (scoped via projectId)
router.get('/wa-session', waSessionController.getSession);
router.post('/wa-session/connect', waSessionController.connectSession);
router.post('/wa-session/reset', waSessionController.resetSession);

// Rute admin: monitoring seluruh sesi WhatsApp semua project
router.get('/wa-sessions', waSessionController.listAllSessions);
router.post('/wa-sessions/:projectId/disconnect', waSessionController.disconnectSessionByProject);

export default router;
