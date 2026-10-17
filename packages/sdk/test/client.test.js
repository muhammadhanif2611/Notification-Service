import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { NotificationClient } from '../src/index.js';
import { HttpClient } from '../src/http.js';

test('SDK defaults to the deployed gateway', () => {
  assert.equal(new HttpClient({ apiKey: 'test' }).baseUrl, 'https://gateway-service-production-9201.up.railway.app');
});

test('ping, sends, broadcast, nested errors, and retries match the gateway contract', async (t) => {
  const requests = [];
  let failures = 0;
  const server = createServer(async (req, res) => {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    requests.push({ method: req.method, path: req.url, apiKey: req.headers['x-api-key'], body: raw ? JSON.parse(raw) : null });
    res.setHeader('Content-Type', 'application/json');
    if (req.headers['x-api-key'] === 'invalid') {
      res.writeHead(401).end(JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or inactive API Key.' } }));
    } else if (req.headers['x-api-key'] === 'retry' && failures++ === 0) {
      res.writeHead(503).end(JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Try again' } }));
    } else {
      res.writeHead(req.method === 'GET' ? 200 : 202).end(JSON.stringify({ success: true, data: { status: req.method === 'GET' ? 'connected' : 'QUEUED' } }));
    }
  }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}/`;
  const client = new NotificationClient({ apiKey: 'ngw_sand_test', baseUrl });
  assert.equal((await client.ping()).data.status, 'connected');
  await client.testConnection();
  await client.email.send({ to: 'test@example.com', templateCode: 'welcome', variables: { name: 'Hanif' } });
  await client.whatsapp.send({ to: '628123456789', body: 'Halo' });
  await client.broadcast.send({ channel: 'EMAIL', recipients: ['test@example.com'], body: 'Hi {{name}}', recipientVariables: { 'test@example.com': { name: 'Hanif' } } });
  assert.deepEqual(requests.map((r) => [r.method, r.path]), [
    ['GET', '/v1/notifications/ping'], ['GET', '/v1/notifications/ping'],
    ['POST', '/v1/notifications/send'], ['POST', '/v1/notifications/send'], ['POST', '/v1/notifications/broadcast'],
  ]);
  assert.equal(requests[2].body.templateCode, 'welcome');
  assert.equal(requests[2].body.body, undefined);
  assert.deepEqual(requests[4].body.recipientVariables, { 'test@example.com': { name: 'Hanif' } });
  assert.ok(requests.every((r) => r.apiKey === 'ngw_sand_test'));
  const invalid = new NotificationClient({ apiKey: 'invalid', baseUrl });
  await assert.rejects(invalid.ping(), { status: 401, code: 'UNAUTHORIZED', message: 'Invalid or inactive API Key.' });
  assert.equal(requests.length, 6);
  const retry = new NotificationClient({ apiKey: 'retry', baseUrl, maxRetries: 1 });
  assert.equal((await retry.ping()).data.status, 'connected');
  assert.equal(failures, 2);
});
