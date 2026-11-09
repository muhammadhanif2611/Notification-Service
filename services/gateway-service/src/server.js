import express from 'express';
import cors from 'cors';
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

app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'gateway-service', timestamp: new Date().toISOString() })
);

// Tabel routing terpusat untuk meneruskan request ke microservice terkait.
const ROUTE_TABLE = [
  ['post', '/v1/auth/login', [], 'AUTH', '/auth/login'],
  ['post', '/v1/auth/register', [], 'AUTH', '/auth/register'],

  ['get', '/v1/auth/users', ['admin'], 'AUTH', '/auth/users'],
  ['post', '/v1/auth/users', ['admin'], 'AUTH', '/auth/users'],
  ['put', '/v1/auth/users/:id/status', ['admin'], 'AUTH', (req) => `/auth/users/${req.params.id}/status`],
  ['put', '/v1/auth/users/:id', ['admin'], 'AUTH', (req) => `/auth/users/${req.params.id}`],
  ['delete', '/v1/auth/users/:id', ['admin'], 'AUTH', (req) => `/auth/users/${req.params.id}`],

  ['get', '/v1/clients/projects', [], 'CLIENT', '/clients/projects'],
  ['get', '/v1/clients/projects/:id', [], 'CLIENT', (req) => `/clients/projects/${req.params.id}`],
  ['post', '/v1/clients/projects', [], 'CLIENT', '/clients/projects'],
  ['post', '/v1/clients/projects/:id/approve', ['admin'], 'CLIENT', (req) => `/clients/projects/${req.params.id}/approve`],
  ['put', '/v1/clients/projects/:id', [], 'CLIENT', (req) => `/clients/projects/${req.params.id}`],
  ['delete', '/v1/clients/projects/:id', [], 'CLIENT', (req) => `/clients/projects/${req.params.id}`],
  ['get', '/v1/clients/projects/:projectId/webhook-health', [], 'CLIENT', (req) => `/clients/projects/${req.params.projectId}/webhook-health`],

  ['get', '/v1/clients/api-keys', [], 'CLIENT', '/clients/api-keys'],
  ['post', '/v1/clients/api-keys', [], 'CLIENT', '/clients/api-keys'],
  ['post', '/v1/clients/api-keys/:id/regenerate', [], 'CLIENT', (req) => `/clients/api-keys/${req.params.id}/regenerate`],
  ['put', '/v1/clients/api-keys/:id/deactivate', [], 'CLIENT', (req) => `/clients/api-keys/${req.params.id}/deactivate`],
  ['put', '/v1/clients/api-keys/:id', [], 'CLIENT', (req) => `/clients/api-keys/${req.params.id}`],
  ['delete', '/v1/clients/api-keys/:id', [], 'CLIENT', (req) => `/clients/api-keys/${req.params.id}`],

  ['get', '/v1/clients/templates', [], 'CLIENT', '/clients/templates'],
  ['post', '/v1/clients/templates', [], 'CLIENT', '/clients/templates'],
  ['put', '/v1/clients/templates/:id', [], 'CLIENT', (req) => `/clients/templates/${req.params.id}`],
  ['delete', '/v1/clients/templates/:id', [], 'CLIENT', (req) => `/clients/templates/${req.params.id}`],

  ['get', '/v1/admin/clients', ['admin'], 'CLIENT', '/clients/admin/clients'],
  ['get', '/v1/admin/clients/:id', ['admin'], 'CLIENT', (req) => `/clients/admin/clients/${req.params.id}`],

  ['get', '/v1/clients/vendors', ['admin'], 'CLIENT', '/clients/vendors'],
  ['post', '/v1/clients/vendors', ['admin'], 'CLIENT', '/clients/vendors'],
  ['put', '/v1/clients/vendors/:id', ['admin'], 'CLIENT', (req) => `/clients/vendors/${req.params.id}`],
  ['delete', '/v1/clients/vendors/:id', ['admin'], 'CLIENT', (req) => `/clients/vendors/${req.params.id}`],

  ['get', '/v1/clients/wa-session', [], 'DISPATCH', '/wa-session'],
  ['post', '/v1/clients/wa-session/connect', [], 'DISPATCH', '/wa-session/connect'],
  ['post', '/v1/clients/wa-session/reset', [], 'DISPATCH', '/wa-session/reset'],

  ['get', '/v1/admin/wa-sessions', ['admin'], 'DISPATCH', '/wa-sessions'],
  ['post', '/v1/admin/wa-sessions/:projectId/disconnect', ['admin'], 'DISPATCH', (req) => `/wa-sessions/${req.params.projectId}/disconnect`],

  ['get', '/v1/logs', [], 'CALLBACK_LOG', '/logs'],
  ['get', '/v1/statistics', [], 'CALLBACK_LOG', '/statistics'],

  ['get', '/v1/suppressions', ['admin'], 'CALLBACK_LOG', '/suppressions'],
  ['post', '/v1/suppressions', ['admin'], 'CALLBACK_LOG', '/suppressions'],
  ['delete', '/v1/suppressions/:id', ['admin'], 'CALLBACK_LOG', (req) => `/suppressions/${req.params.id}`],
];

for (const [method, path, roles, serviceKey, target] of ROUTE_TABLE) {
  const middlewares = path.startsWith('/v1/auth/login') || path.startsWith('/v1/auth/register')
    ? []
    : [jwtAuth, ...(roles.length ? [roleCheck(roles)] : [])];
  app[method](path, ...middlewares, (req, res) => {
    const targetPath = typeof target === 'function' ? target(req) : target;
    return forwardProxyRequest(`${SERVICES[serviceKey]}${targetPath}`, req, res);
  });
}

// Endpoint pengiriman notifikasi dan verifikasi koneksi API Key.
app.post('/v1/notifications/send', apiKeyAuth, (req, res) =>
  forwardProxyRequest(`${SERVICES.NOTIFICATION}/notifications/process`, req, res)
);
app.post('/v1/notifications/broadcast', apiKeyAuth, (req, res) =>
  forwardProxyRequest(`${SERVICES.NOTIFICATION}/notifications/broadcast`, req, res)
);

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

app.get('/v1/admin/cluster-health', jwtAuth, roleCheck(['admin']), async (_req, res) => {
  const data = await getClusterHealth(SERVICES, config);
  return res.json({ success: true, data });
});

app.get('/v1/admin/queue-metrics', jwtAuth, roleCheck(['admin']), async (_req, res) => {
  const data = await getQueueMetrics(config);
  return res.json({ success: true, data });
});

app.use(errorHandler);

app.listen(config.port, () => {
  logger.info(`Gateway Service running on http://localhost:${config.port}`);
});
