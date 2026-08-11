import pino from 'pino';

const IS_DEVELOPMENT_ENVIRONMENT = process.env.NODE_ENV !== 'production';

// Inisialisasi logger pino terstruktur per service
export function createLogger(serviceName) {
  return pino({
    name: serviceName,
    level: process.env.LOG_LEVEL || 'info',
    ...(IS_DEVELOPMENT_ENVIRONMENT && {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' }
      }
    })
  });
}
