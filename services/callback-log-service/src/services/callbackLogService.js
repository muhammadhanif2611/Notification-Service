import * as callbackLogRepository from '../repositories/callbackLogRepository.js';

// Layanan mengambil daftar log notifikasi terbaru (scoped per project)
export async function getRecentLogs({ projectId = null, limit = 100, page = 1 } = {}) {
  return await callbackLogRepository.findRecentLogs({ projectId, limit, page });
}

// Layanan mengkalkulasi statistik ringkasan status notifikasi (scoped per project)
// Agregasi dilakukan di database via GROUP BY — tidak fetch seluruh row ke memori Node.js
export async function getLogStatistics(projectId = null) {
  const rows = await callbackLogRepository.findLogStats(projectId);

  const stats = { total: 0, sent: 0, failed: 0, pending: 0, whatsapp: 0, email: 0 };
  for (const row of rows) {
    const count = Number(row.count) || 0;
    stats.total += count;
    if (row.status === 'SENT' || row.status === 'DELIVERED' || row.status === 'READ') stats.sent += count;
    if (row.status === 'FAILED') stats.failed += count;
    if (row.status === 'PENDING' || row.status === 'QUEUED' || row.status === 'PROCESSING') stats.pending += count;
    if (row.channel === 'WHATSAPP') stats.whatsapp += count;
    if (row.channel === 'EMAIL') stats.email += count;
  }
  return stats;
}
