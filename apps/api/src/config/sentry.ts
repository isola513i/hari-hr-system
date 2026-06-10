import * as Sentry from '@sentry/node';
import type { Express } from 'express';

/**
 * Initialize Sentry for backend error tracking.
 *
 * Setup:
 * 1. Create a Node.js project at https://sentry.io
 * 2. Copy the DSN from project settings → Client Keys (DSN)
 * 3. Set SENTRY_DSN in Render env vars (and locally in .env)
 *
 * MUST be called at the very top of index.ts, before importing any
 * instrumented modules.
 */
export const initSentry = (): void => {
  const dsn = process.env.SENTRY_DSN;
  const env = process.env.NODE_ENV ?? 'development';
  const isProd = env === 'production';

  if (!dsn) {
    if (isProd) console.warn('[Sentry] SENTRY_DSN not configured — error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment: env,
    tracesSampleRate: isProd ? 0.1 : 1.0,
    attachStacktrace: true,
    sendDefaultPii: false,

    beforeSend(event) {
      // Strip sensitive data before sending
      if (event.request) {
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
        const data = event.request.data as Record<string, unknown> | undefined;
        if (data && typeof data === 'object') {
          for (const k of ['password', 'currentPassword', 'newPassword', 'token', 'refreshToken', 'secret']) {
            if (k in data) data[k] = '[REDACTED]';
          }
        }
      }
      return event;
    },

    ignoreErrors: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'],
  });
};

/**
 * Attach Sentry's Express integration to an app instance.
 * Call AFTER all routes are registered but BEFORE your own errorHandler middleware.
 */
export const registerSentryExpress = (app: Express): void => {
  if (!process.env.SENTRY_DSN) return;
  Sentry.setupExpressErrorHandler(app);
};

/** Manually capture an error to Sentry. */
export const captureError = (error: Error, context?: Record<string, unknown>): void => {
  Sentry.captureException(error, context ? { extra: context } : undefined);
};
