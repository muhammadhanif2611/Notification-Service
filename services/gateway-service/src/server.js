import express from 'express';
import cors from 'cors';
import { Queue } from 'bullmq';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { createLogger } from '@notification-gateway/shared';
import { config } from './config/env.js';
import { createCorsOptions } from './config/cors.js';
import { apiKeyAuth, jwtAuth, roleCheck } from './middlewares/auth.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { forwardProxyRequest } from './services/proxyService.js';
import { getClusterHealth, getQueueMetrics } from './services/infraMonitorService.js';

const logger = createLogger('gateway-service');
const app = express();

const SERVICES = {
  AUTH: process.env.AUTH_SERVICE_URL || 'http://localhost:3002',
  CLIENT: process.env.CLIENT_SERVICE_URL || 'http://localhost:3003',
  NOTIFICATION: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004',
  CALLBACK_LOG: process.env.CALLBACK_LOG_SERVICE_URL || 'http://localhost:3005',
  DISPATCH: process.env.DISPATCH_SERVICE_URL || 'http://localhost:3006'
};

const corsOptions = createCorsOptions(config);

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

// Endpoint health check server gateway
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'gateway-service', timestamp: new Date().toISOString() })
);

// Tabel route proxy — config-driven
// Kolom: method HTTP, path gateway, roles required, service tujuan, path target.
const ROUTE_TABLE = [
  // Auth Service (publik)
  ['post', '/v1/auth/login', [], 'AUTH', '/auth/login'],
  ['post', '/v1/auth/register', [], 'AUTH', '/auth/register'],

  // Manajemen User oleh Admin
  ['get', '/v1/auth/users', ['admin'], 'AUTH', '/auth/users'],
  ['post', '/v1/auth/users', ['admin'], 'AUTH', '/auth/users'],
  ['put', '/v1/auth/users/:id/status', ['admin'], 'AUTH', (req) => `/auth/users/${req.params.id}/status`],
  ['put', '/v1/auth/users/:id', ['admin'], 'AUTH', (req) => `/auth/users/${req.params.id}`],
  ['delete', '/v1/auth/users/:id', ['admin'], 'AUTH', (req) => `/auth/users/${req.params.id}`],

  // Client Service — Projects (Model 2: Request & Admin Approval)
  ['get', '/v1/clients/projects', [], 'CLIENT', '/clients/projects'],
  ['get', '/v1/clients/projects/:id', [], 'CLIENT', (req) => `/clients/projects/${req.params.id}`],
  ['post', '/v1/clients/projects', [], 'CLIENT', '/clients/projects'],
  ['post', '/v1/clients/projects/:id/approve', ['admin'], 'CLIENT', (req) => `/clients/projects/${req.params.id}/approve`],
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
  ['get', '/v1/admin/clients', ['admin'], 'CLIENT', '/clients/admin/clients'],
  ['get', '/v1/admin/clients/:id', ['admin'], 'CLIENT', (req) => `/clients/admin/clients/${req.params.id}`],

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

  // Callback Log Service — Suppression List (admin only)
  ['get', '/v1/suppressions', ['admin'], 'CALLBACK_LOG', '/suppressions'],
  ['post', '/v1/suppressions', ['admin'], 'CALLBACK_LOG', '/suppressions'],
  ['delete', '/v1/suppressions/:id', ['admin'], 'CALLBACK_LOG', (req) => `/suppressions/${req.params.id}`],

  // Callback Log Service — Threshold Alert (admin only)
  ['get', '/v1/alert-rules', ['admin'], 'CALLBACK_LOG', '/alert-rules'],
  ['post', '/v1/alert-rules', ['admin'], 'CALLBACK_LOG', '/alert-rules'],
  ['put', '/v1/alert-rules/:id', ['admin'], 'CALLBACK_LOG', (req) => `/alert-rules/${req.params.id}`],
  ['delete', '/v1/alert-rules/:id', ['admin'], 'CALLBACK_LOG', (req) => `/alert-rules/${req.params.id}`],
  ['get', '/v1/alert-history', ['admin'], 'CALLBACK_LOG', '/alert-history'],
  ['post', '/v1/alert-history/:id/resolve', ['admin'], 'CALLBACK_LOG', (req) => `/alert-history/${req.params.id}/resolve`],

  // Client Service — Domain & MTA (admin only)
  ['get', '/v1/admin/mta/domains', ['admin'], 'CLIENT', '/clients/admin/mta/domains'],
  ['post', '/v1/admin/mta/domains/:id/verify', ['admin'], 'CLIENT', (req) => `/clients/admin/mta/domains/${req.params.id}/verify`],
  ['get', '/v1/admin/mta/ip-pools', ['admin'], 'CLIENT', '/clients/admin/mta/ip-pools'],
  ['post', '/v1/admin/mta/ip-pools', ['admin'], 'CLIENT', '/clients/admin/mta/ip-pools'],
  ['delete', '/v1/admin/mta/ip-pools/:id', ['admin'], 'CLIENT', (req) => `/clients/admin/mta/ip-pools/${req.params.id}`],

  // Client Service — Webhook health check (pemilik project)
  ['get', '/v1/clients/projects/:projectId/webhook-health', [], 'CLIENT', (req) => `/clients/projects/${req.params.projectId}/webhook-health`],
];

// Daftarkan seluruh route dari tabel — auth jwtAuth selalu aktif kecuali rute publik auth
for (const [method, path, roles, serviceKey, target] of ROUTE_TABLE) {
  const middlewares = path.startsWith('/v1/auth/login') || path.startsWith('/v1/auth/register')
    ? []
    : [jwtAuth, ...(roles.length ? [roleCheck(roles)] : [])];
  app[method](path, ...middlewares, (req, res) => {
    const targetPath = typeof target === 'function' ? target(req) : target;
    return forwardProxyRequest(`${SERVICES[serviceKey]}${targetPath}`, req, res);
  });
}

// Notification Service — pakai apiKeyAuth (bukan JWT)
app.post('/v1/notifications/send', apiKeyAuth, (req, res) =>
  forwardProxyRequest(`${SERVICES.NOTIFICATION}/notifications/process`, req, res)
);
app.post('/v1/notifications/broadcast', apiKeyAuth, (req, res) =>
  forwardProxyRequest(`${SERVICES.NOTIFICATION}/notifications/broadcast`, req, res)
);

// Ping / Handshake Telemetry — memvalidasi API Key dan mencatat waktu hit pertama/terakhir SDK
app.get('/v1/notifications/ping', apiKeyAuth, (req, res) => {
  return res.json({
    success: true,
    data: {
      status: 'connected',
      message: 'Koneksi ke Notification Gateway berhasil diverifikasi.',
      project: {
        id: req.project.id,
        name: req.project.name,
        slug: req.project.slug,
      },
      environment: req.environment,
      rateLimitPerMin: req.project.rate_limit_per_min,
      dailyQuota: req.project.daily_quota,
      keyPrefix: req.apiKeyRecord.key_prefix,
      keyPreview: req.apiKeyRecord.key_preview,
      timestamp: new Date().toISOString()
    }
  });
});

// ── Admin: Tambahan Endpoint ───────────────────────────────────────────────
// GET /v1/admin/vendors — list vendors untuk admin
app.get('/v1/admin/vendors', jwtAuth, roleCheck(['admin']), (req, res) =>
  forwardProxyRequest(`${SERVICES.CLIENT}/clients/vendors`, req, res)
);

// Telemetri infrastruktur live: kesehatan cluster & metrik antrean
app.get('/v1/admin/cluster-health', jwtAuth, roleCheck(['admin']), async (req, res) => {
  const data = await getClusterHealth(SERVICES, config);
  return res.json({ success: true, data });
});

app.get('/v1/admin/queue-metrics', jwtAuth, roleCheck(['admin']), async (req, res) => {
  const data = await getQueueMetrics(config);
  return res.json({ success: true, data });
});

// ── Bull Board (Queue Monitoring UI) ───────────────────────────────────────
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
