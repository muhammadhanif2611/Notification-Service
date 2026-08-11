import * as callbackLogRepository from '../repositories/callbackLogRepository.js';

// Layanan mengambil daftar 100 log notifikasi terbaru
export async function getRecentLogs() {
  return await callbackLogRepository.findRecentLogs(100);
}

// Layanan mengkalkulasi statistik ringkasan status notifikasi
export async function getLogStatistics() {
  const logs = await callbackLogRepository.findAllLogStats();
  return {
    total: logs.length,
    sent: logs.filter(l => l.status === 'SENT').length,
    failed: logs.filter(l => l.status === 'FAILED').length,
    pending: logs.filter(l => l.status === 'PENDING' || l.status === 'QUEUED').length,
    whatsapp: logs.filter(l => l.channel === 'WHATSAPP').length,
    email: logs.filter(l => l.channel === 'EMAIL').length
  };
}
