#!/usr/bin/env node
/**
 * Unified Backend Runner untuk Production di Railway
 * Menjalankan ke-6 microservices (Gateway, Auth, Client, Notification, Callback, Dispatch)
 * secara bersamaan di dalam 1 container agar hemat resource dan muat di Railway Free Plan.
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// Gateway port di Railway biasanya menggunakan process.env.PORT
const gatewayPort = process.env.PORT || 3001;

const services = [
  { name: 'auth-service', script: 'services/auth-service/src/server.js', port: 3002 },
  { name: 'client-service', script: 'services/client-service/src/server.js', port: 3003 },
  { name: 'notification-service', script: 'services/notification-service/src/server.js', port: 3004 },
  { name: 'callback-log-service', script: 'services/callback-log-service/src/server.js', port: 3005 },
  { name: 'dispatch-service', script: 'services/dispatch-service/src/index.js', port: 3006 },
  { name: 'gateway-service', script: 'services/gateway-service/src/server.js', port: gatewayPort },
];

console.log('====================================================');
console.log('🚀 Launching Notification Gateway Unified Backend...');
console.log('====================================================\n');

const runningProcesses = new Map();
let shuttingDown = false;

// Helper menjalankan masing-masing service dengan auto-restart jika mati mendadak
function startService(service, attempt = 0) {
  if (shuttingDown) return;
  const { name, script, port } = service;
  const startedAt = Date.now();

  const env = {
    ...process.env,
    ...(port ? { PORT: String(port) } : {}),
    // Pastikan routing internal gateway mengarah ke localhost port masing-masing
    AUTH_SERVICE_URL: 'http://127.0.0.1:3002',
    CLIENT_SERVICE_URL: 'http://127.0.0.1:3003',
    NOTIFICATION_SERVICE_URL: 'http://127.0.0.1:3004',
    CALLBACK_LOG_SERVICE_URL: 'http://127.0.0.1:3005',
    DISPATCH_SERVICE_URL: 'http://127.0.0.1:3006'
  };

  const child = spawn('node', [script], {
    cwd: rootDir,
    stdio: 'inherit',
    env
  });

  runningProcesses.set(name, child);

  child.on('exit', (code, signal) => {
    runningProcesses.delete(name);
    if (shuttingDown) return;
    const uptimeMs = Date.now() - startedAt;
    const nextAttempt = uptimeMs > 30000 ? 0 : attempt + 1;
    const delayMs = Math.min(1000 * 2 ** nextAttempt, 15000);
    console.error(`⚠️ [${name}] stopped (code: ${code}, signal: ${signal}) — restarting in ${delayMs}ms`);
    setTimeout(() => startService(service, nextAttempt), delayMs);
  });
}

// Mulai worker & microservices terlebih dahulu, lalu gateway di akhir
services.forEach((svc) => startService(svc));

// Tangani graceful shutdown saat container di-stop oleh Railway
function shutdown() {
  shuttingDown = true;
  console.log('\n🛑 Shutting down all services gracefully...');
  for (const child of runningProcesses.values()) {
    child.kill('SIGTERM');
  }
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
