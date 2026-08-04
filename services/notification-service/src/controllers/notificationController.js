import { NotificationService } from '../services/notificationService.js';

/**
 * Controller for Notification Routes.
 * Each method delegates 100% of business logic to NotificationService.
 */
export class NotificationController {
  /**
   * POST /notifications/process
   * Ingest a single notification request, validate, and enqueue.
   */
  static async process(req, res, next) {
    try {
      // `project`, `environment`, and `apiKeyPrefix` are injected by the
      // gateway-service via request context headers before proxying.
      const context = {
        body: req.body,
        project: req.body.project ?? { id: req.headers['x-project-id'] },
        environment: req.body.environment ?? req.headers['x-environment'] ?? 'production',
        apiKeyPrefix: req.body.apiKeyPrefix ?? req.headers['x-api-key-prefix'] ?? 'ngw_prod_'
      };

      const result = await NotificationService.processNotification(context);

      return res.status(202).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * POST /notifications/broadcast
   * Ingest a broadcast to multiple recipients and enqueue all jobs.
   */
  static async broadcast(req, res, next) {
    try {
      const { channel, recipients, templateCode, body, subject, variables, project, isSandbox } = req.body;

      const result = await NotificationService.processBroadcast({
        channel,
        recipients,
        templateCode,
        body,
        subject,
        variables,
        project: project ?? { id: req.headers['x-project-id'] },
        isSandbox: isSandbox ?? req.headers['x-environment'] === 'sandbox'
      });

      return res.status(202).json({
        success: true,
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /notifications/logs/:projectId
   * Paginated fetch of notification logs for a project.
   */
  static async getLogs(req, res, next) {
    try {
      const { projectId } = req.params;
      const { page = 1, limit = 20, status, channel } = req.query;

      const result = await NotificationService.getNotificationLogs({
        projectId,
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        status: status ?? null,
        channel: channel ?? null
      });

      return res.json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * GET /notifications/:messageId
   * Fetch a single notification record by its messageId.
   */
  static async getByMessageId(req, res, next) {
    try {
      const { messageId } = req.params;
      const log = await NotificationService.getNotificationByMessageId(messageId);

      return res.json({
        success: true,
        data: log
      });
    } catch (err) {
      next(err);
    }
  }
}
