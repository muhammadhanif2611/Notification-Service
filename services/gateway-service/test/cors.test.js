import assert from 'node:assert/strict';
import { test } from 'node:test';
import express from 'express';
import cors from 'cors';
import { createCorsOptions, parseCorsOrigins } from '../src/config/cors.js';

test('production preflight accepts the Vercel dashboard and SDK headers', async (t) => {
  const app = express();
  app.use(cors(createCorsOptions({ corsOrigins: parseCorsOrigins(), environment: 'production' })));
  app.use((error, _req, res, _next) => res.status(error.statusCode).json({ code: error.errorCode }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/v1/notifications/send`;
  const response = await fetch(url, {
    method: 'OPTIONS',
    headers: {
      Origin: 'https://notification-gateway.vercel.app',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'content-type,x-api-key,authorization',
    },
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://notification-gateway.vercel.app');
  assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  assert.match(response.headers.get('access-control-allow-headers'), /x-api-key/);
  assert.match(response.headers.get('vary'), /Origin/);

  for (const origin of ['https://untrusted.vercel.app', 'http://localhost:9999']) {
    const denied = await fetch(url, { method: 'OPTIONS', headers: { Origin: origin } });
    assert.equal(denied.status, 403);
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
    assert.equal((await denied.json()).code, 'CORS_ORIGIN_DENIED');
  }
});

test('origins normalize configuration and preserve server SDK and local development access', () => {
  assert.deepEqual(parseCorsOrigins(' https://example.com/, ,https://example.com '), ['https://example.com']);
  const production = createCorsOptions({ corsOrigins: parseCorsOrigins(), environment: 'production' });
  production.origin(undefined, (error, allowed) => {
    assert.equal(error, null);
    assert.equal(allowed, true);
  });
  const development = createCorsOptions({ corsOrigins: [], environment: 'development' });
  development.origin('http://localhost:5173', (error, allowed) => {
    assert.equal(error, null);
    assert.equal(allowed, true);
  });
  development.origin('http://localhost.evil.com:5173', (error) => assert.equal(error.statusCode, 403));
});
