import express from 'express';
import * as notificationController from '../controllers/notificationController.js';

const router = express.Router();

router.post('/process', notificationController.process);
router.post('/broadcast', notificationController.broadcast);
router.get('/logs/:projectId', notificationController.getLogs);
router.get('/:messageId', notificationController.getByMessageId);

export default router;
