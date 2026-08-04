import express from 'express';
import { config } from './config/env.js';
import clientRoutes from './routes/clientRoutes.js';
import { errorHandler } from './middlewares/errorHandler.js';

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'client-service', timestamp: new Date().toISOString() });
});

app.use('/clients', clientRoutes);

// Centralized Error Handler
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`📁 [Client Service] Running on http://localhost:${config.port}`);
});
