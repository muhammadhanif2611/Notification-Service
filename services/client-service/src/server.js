import express from 'express';
import { config } from './config/env.js';
import clientRoutes from './routes/clientRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { createLogger } from '@notification-gateway/shared';

const logger = createLogger('client-service');
const app = express();

app.use(express.json());

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'client-service', timestamp: new Date().toISOString() })
);

app.use('/clients', clientRoutes);
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`Client Service running on http://localhost:${config.port}`);
});
