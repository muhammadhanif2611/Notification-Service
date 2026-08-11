import * as callbackLogService from '../services/callbackLogService.js';

// Controller: mengambil 100 log notifikasi terbaru
export async function getLogs(_req, res) {
  try {
    const data = await callbackLogService.getRecentLogs();
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// Controller: mengambil statistik ringkasan notifikasi
export async function getStatistics(_req, res) {
  try {
    const stats = await callbackLogService.getLogStatistics();
    return res.json({ success: true, stats });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
