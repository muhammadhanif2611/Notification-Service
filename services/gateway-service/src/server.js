import express from 'express';
import cors from 'cors';
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

app.use(cors());
app.use(express.json());

// Endpoint health check server gateway
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'gateway-service', timestamp: new Date().toISOString() })
);

// Helper proxy permintaan HTTP ke microservice tujuan
async function proxyRequest(targetUrl, req, res) {
  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}),
        ...(req.headers['x-api-key'] ? { 'x-api-key': req.headers['x-api-key'] } : {})
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

// Proxy rute Client Service (Projects, API Keys, Templates, Vendors)
app.get('/v1/clients/projects', (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/projects`, req, res));
app.get('/v1/clients/projects/:id', (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/projects/${req.params.id}`, req, res));
app.post('/v1/clients/projects', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/projects`, req, res));
app.put('/v1/clients/projects/:id', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/projects/${req.params.id}`, req, res));

app.post('/v1/clients/api-keys', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/api-keys`, req, res));
app.post('/v1/clients/api-keys/:id/regenerate', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/api-keys/${req.params.id}/regenerate`, req, res));
app.put('/v1/clients/api-keys/:id/deactivate', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/api-keys/${req.params.id}/deactivate`, req, res));

app.get('/v1/clients/templates', (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/templates`, req, res));
app.post('/v1/clients/templates', jwtAuth, (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/templates`, req, res));
app.put('/v1/clients/templates/:id/status', jwtAuth, roleCheck(['admin']), (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/templates/${req.params.id}/status`, req, res));

app.get('/v1/clients/vendors', jwtAuth, roleCheck(['admin']), (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/vendors`, req, res));
app.post('/v1/clients/vendors', jwtAuth, roleCheck(['admin']), (req, res) => proxyRequest(`${SERVICES.CLIENT}/clients/vendors`, req, res));

// Proxy rute Notification Service
app.post('/v1/notifications/send', apiKeyAuth, (req, res) => proxyRequest(`${SERVICES.NOTIFICATION}/notifications/process`, req, res));
app.post('/v1/notifications/broadcast', apiKeyAuth, (req, res) => proxyRequest(`${SERVICES.NOTIFICATION}/notifications/broadcast`, req, res));

// Proxy rute Callback Log Service
app.get('/v1/logs', (req, res) => proxyRequest(`${SERVICES.CALLBACK_LOG}/logs`, req, res));
app.get('/v1/statistics', (req, res) => proxyRequest(`${SERVICES.CALLBACK_LOG}/statistics`, req, res));

app.listen(config.port, () => {
  logger.info(`Gateway Service running on http://localhost:${config.port}`);
});
