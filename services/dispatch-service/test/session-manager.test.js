import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const status = { DISCONNECTED: 'DISCONNECTED', CONNECTING: 'CONNECTING', WAITING_QR: 'WAITING_QR', CONNECTED: 'CONNECTED' };
const reasons = { loggedOut: 401, forbidden: 403, connectionReplaced: 440, badSession: 500, restartRequired: 515, multideviceMismatch: 411 };
const logger = { info() {}, warn() {}, error() {} };
let sockets = [];
let failNext = false;
let authRegistered = false;
mock.module('@notification-gateway/shared', { namedExports: { createLogger: () => logger, WHATSAPP_SESSION_STATUS: status } });
mock.module('qrcode-terminal', { defaultExport: { generate() {} } });
mock.module('@whiskeysockets/baileys', {
  defaultExport() {
    if (failNext) { failNext = false; throw new Error('Socket setup failed'); }
    const ev = new EventEmitter();
    const socket = {
      ev,
      end() { ev.emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: 408 } } } }); },
      async logout() { ev.emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: 401 } } } }); },
    };
    sockets.push(socket);
    return socket;
  },
  namedExports: {
    DisconnectReason: reasons,
    useMultiFileAuthState: async () => ({ state: { creds: { registered: authRegistered } }, saveCreds: async () => {} }),
    fetchLatestBaileysVersion: async () => ({ version: [2, 3000, 1] }),
  },
});
const manager = await import('../src/whatsapp/session-manager.js');
const flush = () => new Promise((resolve) => setImmediate(resolve));

function setup(t) {
  const toolsRoot = path.resolve('.tools');
  fs.mkdirSync(toolsRoot, { recursive: true });
  const sessionRoot = fs.mkdtempSync(path.join(toolsRoot, 'wa-session-test-'));
  const previous = process.env.WA_SESSION_PATH;
  process.env.WA_SESSION_PATH = sessionRoot;
  sockets = [];
  failNext = false;
  authRegistered = false;
  t.mock.timers.enable({ apis: ['setTimeout'] });
  t.after(async () => {
    for (const session of manager.getAllSessionStatuses()) await manager.disconnectProject(session.projectId);
    if (previous === undefined) delete process.env.WA_SESSION_PATH;
    else process.env.WA_SESSION_PATH = previous;
    if (!path.resolve(sessionRoot).startsWith(toolsRoot + path.sep)) throw new Error('Unsafe test cleanup path');
    fs.rmSync(sessionRoot, { recursive: true, force: true });
  });
  return { projectId: randomUUID(), sessionRoot };
}

test('repeated connect while pairing reuses the socket and QR', async (t) => {
  const { projectId } = setup(t);
  const socket = await manager.connectProject(projectId);
  socket.ev.emit('connection.update', { qr: 'pairing-qr' });
  assert.equal(await manager.connectProject(projectId), socket);
  assert.equal(sockets.length, 1);
  assert.equal(manager.getProjectSessionStatus(projectId).qr, 'pairing-qr');
});

test('manual disconnect cancels reconnect and ignores late socket events', async (t) => {
  const { projectId } = setup(t);
  const socket = await manager.connectProject(projectId);
  await manager.disconnectProject(projectId);
  socket.ev.emit('connection.update', { qr: 'stale-qr' });
  t.mock.timers.tick(60000);
  await flush();
  assert.equal(sockets.length, 1);
  assert.equal(manager.getProjectSessionStatus(projectId).status, 'DISCONNECTED');
  assert.equal(manager.getProjectSessionStatus(projectId).qr, null);
});

test('restart after QR scan stays CONNECTING until the new socket opens', async (t) => {
  const { projectId } = setup(t);
  const socket = await manager.connectProject(projectId);
  socket.ev.emit('connection.update', { qr: 'old-qr' });
  socket.ev.emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: 515 } } } });
  assert.equal(manager.getProjectSessionStatus(projectId).status, 'CONNECTING');
  assert.equal(manager.getProjectSessionStatus(projectId).qr, null);
  t.mock.timers.tick(5000);
  await flush();
  assert.equal(sockets.length, 2);
  socket.ev.emit('connection.update', { connection: 'close' });
  sockets[1].ev.emit('connection.update', { connection: 'open' });
  assert.equal(manager.getProjectSessionStatus(projectId).status, 'CONNECTED');
  t.mock.timers.tick(60000);
  await flush();
  assert.equal(sockets.length, 2);
});

test('failed setup returns DISCONNECTED and a later connect can retry', async (t) => {
  const { projectId } = setup(t);
  failNext = true;
  await assert.rejects(manager.connectProject(projectId), /Socket setup failed/);
  assert.equal(manager.getProjectSessionStatus(projectId).status, 'DISCONNECTED');
  await manager.connectProject(projectId);
  assert.equal(sockets.length, 1);
});

test('logged out sessions clear stale QR and do not reconnect automatically', async (t) => {
  const { projectId } = setup(t);
  const socket = await manager.connectProject(projectId);
  socket.ev.emit('connection.update', { qr: 'expired-qr' });
  socket.ev.emit('connection.update', { connection: 'close', lastDisconnect: { error: { output: { statusCode: 401 } } } });
  assert.equal(manager.getProjectSessionStatus(projectId).qr, null);
  t.mock.timers.tick(60000);
  await flush();
  assert.equal(sockets.length, 1);
});

test('startup restores registered sessions without creating new pairing sessions', async (t) => {
  const { projectId, sessionRoot } = setup(t);
  const unpaired = randomUUID();
  for (const [id, registered] of [[projectId, true], [unpaired, false]]) {
    fs.mkdirSync(path.join(sessionRoot, id));
    fs.writeFileSync(path.join(sessionRoot, id, 'creds.json'), JSON.stringify({ registered }));
  }
  fs.mkdirSync(path.join(sessionRoot, 'unrelated-folder'));
  authRegistered = true;
  await manager.restoreProjectSessions();
  assert.equal(sockets.length, 1);
  assert.equal(manager.getProjectSessionStatus(projectId).status, 'CONNECTING');
  assert.equal(manager.getProjectSessionStatus(unpaired).status, 'DISCONNECTED');
});

test('reset ignores the old socket and creates exactly one fresh pairing socket', async (t) => {
  const { projectId, sessionRoot } = setup(t);
  const socket = await manager.connectProject(projectId);
  fs.writeFileSync(path.join(sessionRoot, projectId, 'creds.json'), '{"registered":true}');
  await manager.resetProjectSession(projectId);
  socket.ev.emit('connection.update', { connection: 'close' });
  t.mock.timers.tick(60000);
  await flush();
  assert.equal(sockets.length, 2);
  assert.equal(manager.getProjectSessionStatus(projectId).status, 'CONNECTING');
  assert.equal(fs.existsSync(path.join(sessionRoot, projectId, 'creds.json')), false);
});

test('reconnect retries setup failures and stops after manual disconnect', async (t) => {
  const { projectId } = setup(t);
  const socket = await manager.connectProject(projectId);
  socket.ev.emit('connection.update', { connection: 'close' });
  failNext = true;
  t.mock.timers.tick(5000);
  await flush();
  assert.equal(manager.getProjectSessionStatus(projectId).status, 'CONNECTING');
  t.mock.timers.tick(10000);
  await flush();
  assert.equal(sockets.length, 2);
  await manager.disconnectProject(projectId);
  t.mock.timers.tick(60000);
  await flush();
  assert.equal(sockets.length, 2);
});
