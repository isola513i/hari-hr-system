import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { captureError } from '../config/sentry';

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
  console.error('API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: sanitizeBody(req.body),
    query: req.query,
  });

  // Handle multer / file upload errors as 400
  if (err instanceof multer.MulterError || err.message?.startsWith('File type not allowed')) {
    res.status(400).json({ error: err.message });
    return;
  }

  // Determine status code
  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Internal Server Error' : err.message;

  // Only send 5xx errors to Sentry — 4xx are usually expected (validation,
  // auth failures, etc.) and would just create noise.
  if (statusCode >= 500) {
    captureError(err, {
      url: req.url,
      method: req.method,
      statusCode,
    });
  }

  // Never send stack traces or internal details to the client
  res.status(statusCode).json({
    error: message,
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
 * Create an API error with status code
 */
export const createApiError = (
  message: string,
  statusCode: number = 500,
  details?: any
): ApiError => {
  const error = new Error(message) as ApiError;
  error.statusCode = statusCode;
  error.details = details;
  return error;
};
