import express from 'express';
import cors from 'cors';
import { Queue } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

import { ExpressAdapter } from '@bull-board/express';
import { createLogger } from '@notification-gateway/shared';
import { config } from './config/env.js';
import { apiKeyAuth, jwtAuth, roleCheck } from './middlewares/auth.js';

const logger = createLogger('gateway-service');
const app = express();

const SERVICES = {
  AUTH: process.env.AUTH_SERVICE_URL || 'http://localhost:3002',
  CLIENT: process.env.CLIENT_SERVICE_URL || 'http://localhost:3003',
  NOTIFICATION: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
  CALLBACK_LOG: process.env.CALLBACK_LOG_SERVICE_URL || 'http://localhost:3005'
};

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
}));
app.use(express.json());

// Endpoint health check server gateway
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'gateway-service', timestamp: new Date().toISOString() })
);

// Helper proxy permintaan HTTP ke microservice tujuan
// GET requests: forward query params + user info via headers
// POST/PUT/DELETE: inject user info ke body
async function proxyRequest(targetUrl, req, res) {
  try {
    // Build URL dengan query params untuk GET requests
    let url = targetUrl;
    if (req.method === 'GET' || req.method === 'HEAD') {
      const queryString = new URLSearchParams(req.query).toString();
      if (queryString) url += `?${queryString}`;
    }

    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
        ...(req.headers['x-api-key'] ? { 'x-api-key': req.headers['x-api-key'] } : {}),
        // Forward user info via headers untuk GET requests (client-service baca dari sini)
        ...(req.user ? { 'x-user-id': req.user.userId, 'x-user-role': req.user.role } : {}),
        ...(req.project ? { 'x-project-id': req.project.id } : {}),
        ...(req.environment ? { 'x-environment': req.environment } : {})
      },
      ...(req.method !== 'GET' && req.method !== 'HEAD'
        ? { body: JSON.stringify({ ...req.body, user: req.user, project: req.project, environment: req.environment }) }
        : {})
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    logger.error({ targetUrl, err: err.message }, 'Proxy request failed');
    return res.status(502).json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Target microservice unavailable' } });
  }
}

// Proxy rute Auth Service
app.post('/v1/auth/login', (req, res) => proxyRequest(`${SERVICES.AUTH}/auth/login`, req, res));
app.post('/v1/auth/register', (req, res) => proxyRequest(`${SERVICES.AUTH}/auth/register`, req, res));

// Proxy rute Manajemen User oleh Admin (akun client dibuat oleh admin)
app.get('/v1/auth/users', jwtAuth, roleCheck(['admin']), (req, res) => proxyRequest(`${SERVICES.AUTH}/auth/users`, req, res));
app.post('/v1/auth/users', jwtAuth, roleCheck(['admin']), (req, res) => proxyRequest(`${SERVICES.AUTH}/auth/users`, req, res));
app.put('/v1/auth/users/:id/status', jwtAuth, roleCheck(['admin']), (req, res) => proxyRequest(`${SERVICES.AUTH}/auth/users/${req.params.id}/status`, req, res));
app.delete('/v1/auth/users/:id', jwtAuth, roleCheck(['admin']), (req, res) => proxyRequest(`${SERVICES.AUTH}/auth/users/${req.params.id}`, req, res));

// Proxy rute Client Service (Projects, API Keys, Templates, Vendors)
// Semua route GET juga pakai jwtAuth agar user info ter-forward
app.get('/v1/clients/projects', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/projects`, req, res));
app.get('/v1/clients/projects/:id', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/projects/${req.params.id}`, req, res));
app.post('/v1/clients/projects', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/projects`, req, res));
app.put('/v1/clients/projects/:id', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/projects/${req.params.id}`, req, res));
app.delete('/v1/clients/projects/:id', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/projects/${req.params.id}`, req, res));

app.get('/v1/clients/api-keys', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/api-keys`, req, res));
app.post('/v1/clients/api-keys', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/api-keys`, req, res));
app.post('/v1/clients/api-keys/:id/regenerate', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/api-keys/${req.params.id}/regenerate`, req, res));
app.put('/v1/clients/api-keys/:id/deactivate', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/api-keys/${req.params.id}/deactivate`, req, res));
app.put('/v1/clients/api-keys/:id', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/api-keys/${req.params.id}`, req, res));
app.delete('/v1/clients/api-keys/:id', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/api-keys/${req.params.id}`, req, res));

app.get('/v1/clients/templates', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/templates`, req, res));
app.post('/v1/clients/templates', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/templates`, req, res));
app.put('/v1/clients/templates/:id/status', jwtAuth, roleCheck(['admin']), (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/templates/${req.params.id}/status`, req, res));
app.put('/v1/clients/templates/:id', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/templates/${req.params.id}`, req, res));
app.delete('/v1/clients/templates/:id', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/templates/${req.params.id}`, req, res));

app.get('/v1/clients/vendors', jwtAuth, roleCheck(['admin']), (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/vendors`, req, res));
app.post('/v1/clients/vendors', jwtAuth, roleCheck(['admin']), (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/vendors`, req, res));

// Manajemen sesi WhatsApp (Baileys) — QR pairing & reset (admin only)
app.get('/v1/clients/wa-session', jwtAuth, roleCheck(['admin']), (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/wa-session`, req, res));
app.post('/v1/clients/wa-session/reset', jwtAuth, roleCheck(['admin']), (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/wa-session/reset`, req, res));

// Proxy rute Notification Service
app.post('/v1/notifications/send', apiKeyAuth, (req, res) => proxyRequest(`${SERVICES.NOTIFICATION}/notifications/process`, req, res));
app.post('/v1/notifications/broadcast', apiKeyAuth, (req, res) => proxyRequest(`${SERVICES.NOTIFICATION}/notifications/broadcast`, req, res));

// Proxy rute Callback Log Service (dengan auth untuk scoping)
app.get('/v1/logs', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CALLBACK_LOG}/logs`, req, res));
app.get('/v1/statistics', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CALLBACK_LOG}/statistics`, req, res));

// ── Admin: Tambahan Endpoint ───────────────────────────────────────────────
// GET /v1/admin/vendors — list vendors (termasuk credential preview untuk admin)
app.get('/v1/admin/vendors', jwtAuth, roleCheck(['admin']), async (req, res) => {
  try {
    const response = await fetch(`${SERVICES.CLIENT}/clients/vendors`);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    logger.error({ err: err.message }, 'Failed to fetch vendors');
    return res.status(502).json({ success: false, error: { message: 'Client service unavailable' } });
  }
});

// ── Bull Board (Queue Monitoring UI) ───────────────────────────────────────
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(new Queue('notification-dispatch-queue', { connection: config.redis })),
    new BullMQAdapter(new Queue('webhook-delivery-queue', { connection: config.redis })),
  ],
  serverAdapter,
});
app.use('/admin/queues', serverAdapter.getRouter());

app.listen(config.port, () => {
  logger.info(`Gateway Service running on http://localhost:${config.port}`);
});
