export const PRODUCTION_FRONTEND_ORIGIN = 'https://notification-gateway.vercel.app';

export function parseCorsOrigins(value, environment = 'production') {
  const origins = value?.trim()
    ? value.split(',').map((origin) => origin.trim().replace(/\/+$/, '')).filter(Boolean)
    : [PRODUCTION_FRONTEND_ORIGIN];

  if (environment === 'development') {
    origins.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }
  return [...new Set(origins)];
}

export function createCorsOptions({ corsOrigins, environment }) {
  return {
    origin(origin, callback) {
      if (!origin || corsOrigins.includes('*') || corsOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (environment === 'development') {
        try {
          const url = new URL(origin);
          if (['http:', 'https:'].includes(url.protocol) && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
            return callback(null, true);
          }
        } catch { /* Reject malformed origins below. */ }
      }

      const error = new Error(`CORS policy: Origin ${origin} not allowed`);
      error.statusCode = 403;
      error.errorCode = 'CORS_ORIGIN_DENIED';
      return callback(error);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type', 'Authorization', 'x-api-key', 'x-user-id', 'x-user-role',
      'x-project-id', 'x-environment', 'x-webhook-signature', 'webhook-id',
      'webhook-timestamp', 'webhook-signature', 'Accept'
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'ETag'],
    maxAge: 86400,
  };
}
