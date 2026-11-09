import * as callbackLogService from '../services/callbackLogService.js';

// Controller riwayat log notifikasi dan statistik pengiriman.
export async function getLogs(req, res, next) {
  try {
    const { projectId, channel, status, limit = 100, page = 1 } = req.query;
    const parsedLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);

    const data = await callbackLogService.getRecentLogs({
      projectId: projectId || null,
      channel: channel || null,
      status: status || null,
      limit: parsedLimit,
      page: parsedPage
    });

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getStatistics(req, res, next) {
  try {
    const { projectId, range = '7d' } = req.query;
    const stats = await callbackLogService.getLogStatistics(projectId || null, range);
    return res.json({ success: true, stats });
  } catch (err) {
    next(err);
  }
}
