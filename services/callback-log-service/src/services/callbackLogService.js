import * as callbackLogRepository from '../repositories/callbackLogRepository.js';

// Layanan mengambil daftar log notifikasi terbaru (scoped per project)
export async function getRecentLogs({ projectId = null, limit = 100, page = 1 } = {}) {
  return await callbackLogRepository.findRecentLogs({ projectId, limit, page });
}

const RANGE_DAYS = { '7d': 7, '14d': 14, '30d': 30 };

// Statistik ringkasan + tren harian + breakdown channel & status
// Agregasi dilakukan di database via GROUP BY — tidak fetch seluruh row ke memori Node.js
export async function getLogStatistics(projectId = null, range = '7d') {
  const days = RANGE_DAYS[range] || RANGE_DAYS['7d'];
  const [rows, trendRows, channelRows, avgLatencyMs] = await Promise.all([
    callbackLogRepository.findLogStats(projectId),
    callbackLogRepository.findDailyTrend(projectId, days),
    callbackLogRepository.findChannelBreakdown(projectId),
    callbackLogRepository.findAvgLatency(projectId, days)
  ]);

  const stats = {
    total: 0, sent: 0, failed: 0, pending: 0, whatsapp: 0, email: 0,
    total_sent: 0, delivered: 0, success_rate: 0, avg_latency_ms: avgLatencyMs,
    status_breakdown: {}, channel_breakdown: {}, daily_trend: []
  };

  for (const row of rows) {
    const count = Number(row.count) || 0;
    stats.total += count;
    if (row.status === 'SENT' || row.status === 'DELIVERED' || row.status === 'READ') stats.sent += count;
    if (row.status === 'FAILED') stats.failed += count;
    if (row.status === 'PENDING' || row.status === 'QUEUED' || row.status === 'PROCESSING') stats.pending += count;
    if (row.channel === 'WHATSAPP') stats.whatsapp += count;
    if (row.channel === 'EMAIL') stats.email += count;
    stats.status_breakdown[row.status] = (stats.status_breakdown[row.status] || 0) + count;
  }

  for (const row of channelRows) {
    stats.channel_breakdown[row.channel] = Number(row.count) || 0;
  }

  stats.total_sent = stats.sent;
  stats.delivered = stats.sent;
  stats.success_rate = stats.total > 0 ? Number(((stats.sent / stats.total) * 100).toFixed(1)) : 0;
  stats.daily_trend = trendRows.map((row) => ({
    date: row.day,
    delivered: Number(row.delivered) || 0,
    queued: Number(row.queued) || 0,
    failed: Number(row.failed) || 0
  }));

  return stats;
}
