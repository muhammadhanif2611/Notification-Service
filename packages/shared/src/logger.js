import pino from 'pino';

const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';

/**
 * Buat pino logger instance untuk sebuah service.
 * @param {string} serviceName
 * @returns {import('pino').Logger}
 */
export function createLogger(serviceName) {
  return pino({
    name: serviceName,
    level: process.env.LOG_LEVEL || 'info',
    ...(IS_DEVELOPMENT && {
      transport: {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss', ignore: 'pid,hostname' }
      }
    })
  });
}
