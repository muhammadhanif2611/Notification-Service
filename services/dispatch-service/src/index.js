import express from 'express';
import { createLogger } from '@notification-gateway/shared';
import { config } from './config/env.js';
import { startWhatsAppWorker } from './whatsapp/worker.js';
import { startEmailWorker } from './email/worker.js';
import waSessionRoutes from './routes/waSessionRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const logger = createLogger('dispatch-service');

// Inisialisasi worker antrean WhatsApp dan Email
startWhatsAppWorker(config.redis);
startEmailWorker(config.redis);

// Sesi WhatsApp multi-project: lazy-connect saat ada job masuk atau client request via HTTP.
// Tidak ada auto-connect global di startup.
logger.info('Dispatch Service started — WhatsApp sessions will connect on demand');

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

app.listen(config.port, () => {
  logger.info(`Dispatch Service HTTP running on http://localhost:${config.port}`);
});
