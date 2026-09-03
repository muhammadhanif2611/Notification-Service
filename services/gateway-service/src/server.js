import express from 'express';
import cors from 'cors';
import { Queue } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

import { ExpressAdapter } from '@bull-board/express';
import { createLogger } from '@notification-gateway/shared';
import { config } from './config/env.js';
import { apiKeyAuth, jwtAuth, roleCheck } from './middlewares/auth.js';
import { errorHandler } from './middlewares/errorHandler.js';

const logger = createLogger('gateway-service');
const app = express();

const SERVICES = {
  AUTH: process.env.AUTH_SERVICE_URL || 'http://localhost:3002',
  CLIENT: process.env.CLIENT_SERVICE_URL || 'http://localhost:3003',
  NOTIFICATION: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
  CALLBACK_LOG: process.env.CALLBACK_LOG_SERVICE_URL || 'http://localhost:3005',
  DISPATCH: process.env.DISPATCH_SERVICE_URL || 'http://localhost:3006'
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

// Helper proxy permintaan HTTP ke microservice tujuan.
// User info (user, project, environment) SELALU dikirim via header untuk SEMUA method —
// body request tidak pernah dicemari metadata auth.
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
        // Forward user info via header — konsisten untuk semua method
        ...(req.user ? { 'x-user-id': req.user.userId, 'x-user-role': req.user.role } : {}),
        ...(req.project ? { 'x-project-id': req.project.id } : {}),
        ...(req.environment ? { 'x-environment': req.environment } : {})
      },
      ...(req.method !== 'GET' && req.method !== 'HEAD'
        ? { body: JSON.stringify(req.body) }
        : {})
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    logger.error({ targetUrl, err: err.message }, 'Proxy request failed');
    return res.status(502).json({ success: false, error: { code: 'SERVICE_UNAVAILABLE', message: 'Target microservice unavailable' } });
  }
}

// Tabel route proxy — config-driven, menggantikan definisi satu-per-satu.
// Kolom: method HTTP, path gateway, middleware auth, service tujuan, path target.
const ROUTE_TABLE = [
  // Auth Service (publik)
  ['post', '/v1/auth/login', [], 'AUTH', '/auth/login'],
  ['post', '/v1/auth/register', [], 'AUTH', '/auth/register'],

  // Manajemen User oleh Admin
  ['get', '/v1/auth/users', ['admin'], 'AUTH', '/auth/users'],
  ['post', '/v1/auth/users', ['admin'], 'AUTH', '/auth/users'],
  ['put', '/v1/auth/users/:id/status', ['admin'], 'AUTH', (req) => `/auth/users/${req.params.id}/status`],
  ['delete', '/v1/auth/users/:id', ['admin'], 'AUTH', (req) => `/auth/users/${req.params.id}`],

  // Client Service — Projects
  ['get', '/v1/clients/projects', [], 'CLIENT', '/clients/projects'],
  ['get', '/v1/clients/projects/:id', [], 'CLIENT', (req) => `/clients/projects/${req.params.id}`],
  ['post', '/v1/clients/projects', [], 'CLIENT', '/clients/projects'],
  ['put', '/v1/clients/projects/:id', [], 'CLIENT', (req) => `/clients/projects/${req.params.id}`],
  ['delete', '/v1/clients/projects/:id', [], 'CLIENT', (req) => `/clients/projects/${req.params.id}`],

  // Client Service — API Keys
  ['get', '/v1/clients/api-keys', [], 'CLIENT', '/clients/api-keys'],
  ['post', '/v1/clients/api-keys', [], 'CLIENT', '/clients/api-keys'],
  ['post', '/v1/clients/api-keys/:id/regenerate', [], 'CLIENT', (req) => `/clients/api-keys/${req.params.id}/regenerate`],
  ['put', '/v1/clients/api-keys/:id/deactivate', [], 'CLIENT', (req) => `/clients/api-keys/${req.params.id}/deactivate`],
  ['put', '/v1/clients/api-keys/:id', [], 'CLIENT', (req) => `/clients/api-keys/${req.params.id}`],
  ['delete', '/v1/clients/api-keys/:id', [], 'CLIENT', (req) => `/clients/api-keys/${req.params.id}`],

  // Client Service — Templates
  ['get', '/v1/clients/templates', [], 'CLIENT', '/clients/templates'],
  ['post', '/v1/clients/templates', [], 'CLIENT', '/clients/templates'],
  ['put', '/v1/clients/templates/:id', [], 'CLIENT', (req) => `/clients/templates/${req.params.id}`],
  ['delete', '/v1/clients/templates/:id', [], 'CLIENT', (req) => `/clients/templates/${req.params.id}`],

  // Client Service — Vendors (admin only)
  ['get', '/v1/clients/vendors', ['admin'], 'CLIENT', '/clients/vendors'],
  ['post', '/v1/clients/vendors', ['admin'], 'CLIENT', '/clients/vendors'],
  ['put', '/v1/clients/vendors/:id', ['admin'], 'CLIENT', (req) => `/clients/vendors/${req.params.id}`],
  ['delete', '/v1/clients/vendors/:id', ['admin'], 'CLIENT', (req) => `/clients/vendors/${req.params.id}`],

  // Dispatch Service — WA Session per-project (client kelola sendiri)
  ['get', '/v1/clients/wa-session', [], 'DISPATCH', '/wa-session'],
  ['post', '/v1/clients/wa-session/connect', [], 'DISPATCH', '/wa-session/connect'],
  ['post', '/v1/clients/wa-session/reset', [], 'DISPATCH', '/wa-session/reset'],

  // Dispatch Service — Admin monitoring semua sesi WA
  ['get', '/v1/admin/wa-sessions', ['admin'], 'DISPATCH', '/wa-sessions'],
  ['post', '/v1/admin/wa-sessions/:projectId/disconnect', ['admin'], 'DISPATCH', (req) => `/wa-sessions/${req.params.projectId}/disconnect`],

  // Callback Log Service (dengan auth untuk scoping)
  ['get', '/v1/logs', [], 'CALLBACK_LOG', '/logs'],
  ['get', '/v1/statistics', [], 'CALLBACK_LOG', '/statistics'],
];

// Daftarkan seluruh route dari tabel — auth jwtAuth selalu aktif kecuali rute publik auth
for (const [method, path, roles, serviceKey, target] of ROUTE_TABLE) {
  const middlewares = path.startsWith('/v1/auth/login') || path.startsWith('/v1/auth/register')
    ? []
    : [jwtAuth, ...(roles.length ? [roleCheck(roles)] : [])];
  app[method](path, ...middlewares, (req, res) => {
    const targetPath = typeof target === 'function' ? target(req) : target;
    return proxyRequest(`${SERVICES[serviceKey]}${targetPath}`, req, res);
  });
}

// Notification Service — pakai apiKeyAuth (bukan JWT)
app.post('/v1/notifications/send', apiKeyAuth, (req, res) => proxyRequest(`${SERVICES.NOTIFICATION}/notifications/process`, req, res));
app.post('/v1/notifications/broadcast', apiKeyAuth, (req, res) => proxyRequest(`${SERVICES.NOTIFICATION}/notifications/broadcast`, req, res));

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
// Hanya aktif di mode development. Di production Bull Board terus mem-polling
// semua queue (tiap beberapa detik) sehingga sangat boros request Upstash.
// Selain itu adapter diarahkan ke queue yang benar-benar dipakai.
if (process.env.NODE_ENV !== 'production') {
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [
      new BullMQAdapter(new Queue('email-queue', { connection: config.redis })),
      new BullMQAdapter(new Queue('whatsapp-queue', { connection: config.redis })),
      new BullMQAdapter(new Queue('status-queue', { connection: config.redis })),
    ],
    serverAdapter,
  });
  app.use('/admin/queues', jwtAuth, roleCheck(['admin']), serverAdapter.getRouter());
  logger.info('Bull Board aktif di /admin/queues (mode development)');
}

app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`Gateway Service running on http://localhost:${config.port}`);
});
