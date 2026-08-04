import express from 'express';
import { NotificationController } from '../controllers/notificationController.js';

const router = express.Router();

/**
 * Single Notification Ingestion
 * Called by gateway-service after JWT/API Key validation.
 */
router.post('/process', NotificationController.process);

/**
 * Broadcast Notification to Multiple Recipients
 */
router.post('/broadcast', NotificationController.broadcast);

/**
 * Get Notification Logs by Project (paginated)
 * GET /notifications/logs/:projectId?page=1&limit=20&status=QUEUED&channel=WHATSAPP
 */
router.get('/logs/:projectId', NotificationController.getLogs);

/**
 * Get a Single Notification Record by messageId
 * GET /notifications/:messageId
 */
router.get('/:messageId', NotificationController.getByMessageId);

export default router;
