import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { captureError } from '../config/sentry';
import { AppError } from '../utils/errorResponse';
import logger from '../utils/logger';

export interface ApiError extends Error {
  statusCode?: number;
  details?: any;
}

/**
 * Global error handler middleware
 * Catches all errors thrown in route handlers and provides consistent error responses
 */
// Fields to redact from request body before logging
const SENSITIVE_FIELDS = ['password', 'token', 'refreshToken', 'secret', 'currentPassword', 'newPassword'];

function sanitizeBody(body: any): any {
  if (!body || typeof body !== 'object') return body;
  const sanitized = { ...body };
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  return sanitized;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error for debugging (server-side only, with sensitive fields redacted)
  logger.error({
    err,
    url: req.url,
    method: req.method,
    body: sanitizeBody(req.body),
    query: req.query,
  }, 'API Error');

  // Handle multer / file upload errors as 400
  if (err instanceof multer.MulterError || err.message?.startsWith('File type not allowed')) {
    res.status(400).json({ error: err.message });
    return;
  }

  // Determine status code from the unified AppError hierarchy (or legacy statusCode)
  const statusCode = err instanceof AppError ? err.statusCode : (err.statusCode || 500);
  const message = statusCode >= 500 ? 'Internal Server Error' : err.message;

  // Only send 5xx errors to Sentry — 4xx are usually expected (validation,
  // auth failures, etc.) and would just create noise.
  if (statusCode >= 500) {
    captureError(err, {
      url: req.url,
      method: req.method,
      statusCode,
    });
  }

  // Never send stack traces or internal details to the client. Include
  // structured `details` only for client-safe (4xx) errors that carry them
  // (e.g. field-level validation info).
  const details = statusCode < 500 && err instanceof AppError ? err.details : undefined;
  res.status(statusCode).json({
    error: message,
    ...(details !== undefined ? { details } : {}),
  });
};

/**
 * 404 Not Found handler
 * Called when no route matches the request
 */
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.url,
    method: req.method,
  });
};

/**
 * Create an API error with status code.
 * @deprecated Prefer throwing a specific `AppError` subclass
 * (NotFoundError, ValidationError, ForbiddenError, ConflictError, …).
 */
export const createApiError = (
  message: string,
  statusCode: number = 500,
  details?: any
): AppError => new AppError(message, statusCode, details);
