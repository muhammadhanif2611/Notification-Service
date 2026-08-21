import * as callbackLogRepository from '../repositories/callbackLogRepository.js';

// Layanan mengambil daftar log notifikasi terbaru (scoped per project)
export async function getRecentLogs({ projectId = null, limit = 100, page = 1 } = {}) {
  return await callbackLogRepository.findRecentLogs({ projectId, limit, page });
}

// Layanan mengkalkulasi statistik ringkasan status notifikasi (scoped per project)
export async function getLogStatistics(projectId = null) {
  const notificationLogs = await callbackLogRepository.findAllLogStats(projectId);
  return {
    total: notificationLogs.length,
    sent: notificationLogs.filter(log => log.status === 'SENT').length,
    failed: notificationLogs.filter(log => log.status === 'FAILED').length,
    pending: notificationLogs.filter(log => log.status === 'PENDING' || log.status === 'QUEUED').length,
    whatsapp: notificationLogs.filter(log => log.channel === 'WHATSAPP').length,
    email: notificationLogs.filter(log => log.channel === 'EMAIL').length
  };
}
