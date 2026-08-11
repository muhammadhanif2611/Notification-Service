import * as notificationService from '../services/notificationService.js';

// Controller: pemrosesan tunggal notifikasi
export async function process(req, res, next) {
  try {
    const context = {
      body: req.body,
      project: req.body.project ?? { id: req.headers['x-project-id'] },
      environment: req.body.environment ?? req.headers['x-environment'] ?? 'production',
      apiKeyPrefix: req.body.apiKeyPrefix ?? req.headers['x-api-key-prefix'] ?? 'ngw_prod_'
    };
    const data = await notificationService.processNotification(context);
    return res.status(202).json({ success: true, data });
  } catch (err) { next(err); }
}

// Controller: pemrosesan broadcast notifikasi
export async function broadcast(req, res, next) {
  try {
    const { channel, recipients, templateCode, body, subject, variables, project, isSandbox } = req.body;
    const data = await notificationService.processBroadcast({
      channel, recipients, templateCode, body, subject, variables,
      project: project ?? { id: req.headers['x-project-id'] },
      isSandbox: isSandbox ?? req.headers['x-environment'] === 'sandbox'
    });
    return res.status(202).json({ success: true, data });
  } catch (err) { next(err); }
}

// Controller: mengambil riwayat log notifikasi
export async function getLogs(req, res, next) {
  try {
    const { projectId } = req.params;
    const { page = 1, limit = 20, status, channel } = req.query;
    const result = await notificationService.getNotificationLogs({
      projectId,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      status: status ?? null,
      channel: channel ?? null
    });
    return res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (err) { next(err); }
}

// Controller: mengambil detail notifikasi by message ID
export async function getByMessageId(req, res, next) {
  try {
    const data = await notificationService.getNotificationByMessageId(req.params.messageId);
    return res.json({ success: true, data });
  } catch (err) { next(err); }
}
