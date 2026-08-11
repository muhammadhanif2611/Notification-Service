import * as callbackLogRepository from '../repositories/callbackLogRepository.js';

// Layanan mengambil daftar 100 log notifikasi terbaru
export async function getRecentLogs() {
  return await callbackLogRepository.findRecentLogs(100);
}

// Layanan mengkalkulasi statistik ringkasan status notifikasi
export async function getLogStatistics() {
  const notificationLogs = await callbackLogRepository.findAllLogStats();
  return {
    total: notificationLogs.length,
    sent: notificationLogs.filter(log => log.status === 'SENT').length,
    failed: notificationLogs.filter(log => log.status === 'FAILED').length,
    pending: notificationLogs.filter(log => log.status === 'PENDING' || log.status === 'QUEUED').length,
    whatsapp: notificationLogs.filter(log => log.channel === 'WHATSAPP').length,
    email: notificationLogs.filter(log => log.channel === 'EMAIL').length
  };
}
