import { createLogger } from '@notification-gateway/shared';

const logger = createLogger('client-service');

export class AppError extends Error {
  constructor(message, statusCode = 400, errorCode = 'OPERATIONAL_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode || 500;
  const errorCode = err.errorCode || 'INTERNAL_SERVER_ERROR';
  const message = err.message || 'An unexpected error occurred';

  if (statusCode >= 500) {
    logger.error({ err, path: req.path, method: req.method }, message);
  } else {
    logger.warn({ errorCode, path: req.path }, message);
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message,
      ...(err.details ? { details: err.details } : {})
    }
  });
}
