import express from 'express';
import { createLogger } from '@notification-gateway/shared';
import { config } from './config/env.js';
import { startWhatsAppWorker } from './whatsapp/worker.js';
import { startEmailWorker } from './email/worker.js';
import waSessionRoutes from './routes/waSessionRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { restoreProjectSessions, startSessionWatchdog, shutdownAllSessions } from './whatsapp/session-manager.js';

const logger = createLogger('dispatch-service');

// Guard Baileys background socket rejections (mis. sendRetryRequest / 428 Connection Closed saat device removed)
// agar tidak mematikan seluruh process dispatch-service beserta worker Email dan WhatsApp lainnya.
process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  const statusCode = reason?.output?.statusCode;
  logger.warn({ err: err.message, statusCode }, 'Unhandled promise rejection captured in dispatch-service');
});

process.on('uncaughtException', (err) => {
  const statusCode = err?.output?.statusCode;
  const isBaileysTransient =
    err?.message === 'Connection Closed' ||
    statusCode === 408 ||
    statusCode === 428;
  if (isBaileysTransient) {
    logger.warn({ err: err.message, statusCode }, 'Transient Baileys socket exception suppressed');
    return;
  }
  logger.error({ err: err.message, stack: err.stack }, 'Fatal uncaught exception in dispatch-service');
  process.exit(1);
});

// Inisialisasi worker antrean WhatsApp dan Email
startWhatsAppWorker(config.redis);
startEmailWorker(config.redis);

// New projects pair on demand; paired sessions recover after a restart.
restoreProjectSessions().catch((err) =>
  logger.error({ err: err.message }, 'Could not restore saved WhatsApp sessions')
);
// Watchdog auto-heal per projectId: memulihkan sesi terpasang yang mati/macet.
startSessionWatchdog();
logger.info('Dispatch Service started — restoring paired WhatsApp sessions');

// ── HTTP Server: endpoints manajemen sesi WhatsApp per-project ──────────────
const app = express();
app.use(express.json());

// Middleware: populasi req.user dari header yang di-forward gateway
app.use((req, _res, next) => {
  if (req.headers['x-user-id']) {
    req.user = { userId: req.headers['x-user-id'], role: req.headers['x-user-role'] };
  }
  next();
});

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'dispatch-service', timestamp: new Date().toISOString() })
);

app.use(waSessionRoutes);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  logger.info(`Dispatch Service HTTP running on http://localhost:${config.port}`);
});

// Graceful shutdown: simpan kredensial WhatsApp ke volume lalu tutup socket (tanpa logout).
let shutdownStarted = false;
async function gracefulShutdown(signal) {
  if (shutdownStarted) return;
  shutdownStarted = true;
  logger.info({ signal }, 'Dispatch Service shutting down');
  const forceExit = setTimeout(() => process.exit(1), 10000);
  forceExit.unref();
  try {
    await shutdownAllSessions();
  } catch (err) {
    logger.error({ err: err.message }, 'WhatsApp shutdown failed');
  }
  server.close(() => process.exit(0));
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
