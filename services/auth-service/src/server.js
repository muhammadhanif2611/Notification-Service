import express from 'express';
import { config } from './config/env.js';
import authRoutes from './routes/authRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { createLogger } from '@notification-gateway/shared';

const logger = createLogger('auth-service');
const app = express();

app.use(express.json());

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() })
);

app.use('/auth', authRoutes);
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`Auth Service running on http://localhost:${config.port}`);
});
