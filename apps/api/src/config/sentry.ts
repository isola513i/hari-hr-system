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
/**
 * Field names whose values must never reach Sentry. Covers auth secrets plus
 * HR/PII fields specific to this app (national ID, bank, DOB, emergency contact).
 * Matching is case-insensitive and substring-based so variants like
 * `bank_account_number` / `bankAccountNumber` are all caught.
 */
const SENSITIVE_FIELD_PATTERNS = [
  'password',
  'token',
  'secret',
  'apikey',
  'authorization',
  'nationalid',
  'national_id',
  'ssn',
  'socialsecurity',
  'bankaccount',
  'accountnumber',
  'bankcode',
  'routingnumber',
  'dateofbirth',
  'dob',
  'emergencycontact',
  'totp',
  'backupcode',
];

const isSensitiveKey = (key: string): boolean => {
  const k = key.toLowerCase().replace(/[_-]/g, '');
  return SENSITIVE_FIELD_PATTERNS.some((p) => k.includes(p.replace(/[_-]/g, '')));
};

/**
 * Recursively redact sensitive values in an arbitrary structure (objects and
 * arrays), returning a safe copy. Non-object input is returned unchanged.
 */
const scrubSensitive = (input: unknown, depth = 0): unknown => {
  if (depth > 6 || input == null || typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.map((v) => scrubSensitive(v, depth + 1));
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    out[key] = isSensitiveKey(key) ? '[REDACTED]' : scrubSensitive(value, depth + 1);
  }
  return out;
};

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
        event.request.data = scrubSensitive(event.request.data);
      }
      if (event.extra) {
        event.extra = scrubSensitive(event.extra) as Record<string, unknown>;
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
