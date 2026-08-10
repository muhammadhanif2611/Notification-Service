import express from 'express';
import { config } from './config/env.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { createLogger } from '@notification-gateway/shared';

const logger = createLogger('notification-service');
const app = express();

app.use(express.json());

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() })
);

app.use('/notifications', notificationRoutes);
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`Notification Service running on http://localhost:${config.port}`);
});
