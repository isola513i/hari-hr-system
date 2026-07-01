/**
 * Unified application error hierarchy.
 *
 * Throw one of these from services/controllers instead of a bare `Error` + a
 * hand-set `statusCode`, a `BusinessError`, or a raw string. The global
 * errorHandler reads `statusCode`/`details` off any `AppError` and produces a
 * consistent `{ error, details? }` envelope. 4xx errors are client-safe (their
 * message is returned as-is); 5xx are masked to avoid leaking internals.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(message: string, statusCode = 500, details?: unknown) {
    super(message);
    // Use the concrete subclass name (NotFoundError, etc.) for logs.
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, new.target);
  }

  /** True for expected client errors whose message is safe to surface. */
  get isClientSafe(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }
}

/** 400 — invalid input. `details` may carry field-level validation info. */
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 400, details);
  }
}

/** 401 — not authenticated. */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

/** 403 — authenticated but not permitted. */
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

/** 404 — resource not found. */
export class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404);
  }
}

/** 409 — state conflict (duplicate, already-in-state, etc.). */
export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409);
  }
}

/**
 * Business-rule violation (validation, ownership checks, invalid state).
 * Retained as the ergonomic default and for backward compatibility — now an
 * AppError subclass (400, client-safe) so it flows through the same handler.
 * `name` stays 'BusinessError' so existing `err.name === 'BusinessError'`
 * checks keep working.
 */
export class BusinessError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, details);
    this.name = 'BusinessError';
  }
}

/**
 * Extract a safe error message for API responses. Returns the message for any
 * client-safe (4xx) AppError; otherwise the generic fallback so 5xx internals
 * aren't leaked.
 */
export function safeErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof AppError && error.isClientSafe) {
    return error.message;
  }
  return fallback;
}
