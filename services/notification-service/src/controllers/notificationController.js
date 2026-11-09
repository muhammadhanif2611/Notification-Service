import * as notificationService from '../services/notificationService.js';

// Controller pemrosesan pengiriman pesan tunggal dan broadcast berdasarkan konteks header dari Gateway.
export async function process(req, res, next) {
  try {
    const context = {
      body: req.body,
      project: { id: req.headers['x-project-id'] },
      environment: req.headers['x-environment'] ?? 'production',
      apiKeyPrefix: req.headers['x-api-key-prefix'] ?? 'ngw_prod_'
    };
    const data = await notificationService.processNotification(context);
    return res.status(202).json({ success: true, data });
  } catch (err) { next(err); }
}

export async function broadcast(req, res, next) {
  try {
    const { channel, recipients, templateCode, body, subject, variables, recipientVariables } = req.body;
    const isSandbox = req.headers['x-environment'] === 'sandbox' || req.headers['x-api-key-prefix'] === 'ngw_sand_';
    const data = await notificationService.processBroadcast({
      channel, recipients, templateCode, body, subject, variables, recipientVariables,
      project: { id: req.headers['x-project-id'] },
      isSandbox
    });
    return res.status(202).json({ success: true, data });
  } catch (err) { next(err); }
}
