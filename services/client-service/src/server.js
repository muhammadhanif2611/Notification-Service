import express from 'express';
import { config } from './config/env.js';
import clientRoutes from './routes/clientRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { createLogger } from '@notification-gateway/shared';

const logger = createLogger('client-service');
const app = express();

app.use(express.json());

// Middleware: populasi req.user dari header yang di-forward gateway (x-user-id & x-user-role).
// User info tidak lagi dibaca dari body — body murni business payload.
app.use((req, _res, next) => {
  if (req.headers['x-user-id']) {
    req.user = { userId: req.headers['x-user-id'], role: req.headers['x-user-role'] };
  }
  next();
});

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'client-service', timestamp: new Date().toISOString() })
);

app.use('/clients', clientRoutes);
app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`Client Service running on http://localhost:${config.port}`);
});
