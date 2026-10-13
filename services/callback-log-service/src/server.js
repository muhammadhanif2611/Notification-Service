import express from 'express';
import { createLogger } from '@notification-gateway/shared';
import { config } from './config/env.js';
import callbackLogRoutes from './routes/callbackLogRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { startStatusWorker, stopStatusWorker } from './workers/statusWorker.js';
import { flushPendingWebhooks } from './services/webhookService.js';

const logger = createLogger('callback-log-service');
const app = express();

app.use(express.json());

// Endpoint health check
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'callback-log-service', timestamp: new Date().toISOString() })
);

app.use('/', callbackLogRoutes);
app.use(errorHandler);

// Inisialisasi background status worker dengan Redis
startStatusWorker(config.redis);

const server = app.listen(config.port, () => {
  logger.info(`Callback & Log Service running on http://localhost:${config.port}`);
});

// Penanganan graceful shutdown
async function gracefulShutdown(signal) {
  logger.info({ signal }, 'Shutting down Callback & Log Service gracefully...');
  server.close(async () => {
    try {
      await flushPendingWebhooks();
      await stopStatusWorker();
      logger.info('Callback & Log Service shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err: err.message }, 'Error during graceful shutdown');
      process.exit(1);
    }
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
