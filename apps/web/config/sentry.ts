import * as Sentry from '@sentry/react';

/**
 * Initialize Sentry for frontend error tracking.
 *
 * Setup:
 * 1. Create a React project at https://sentry.io
 * 2. Copy the DSN from project settings → Client Keys (DSN)
 * 3. Set VITE_SENTRY_DSN in Vercel env vars (and locally in .env)
 *
 * No-op in development unless VITE_SENTRY_DSN is set.
 */
export const initSentry = (): void => {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  const mode = import.meta.env.MODE;
  const isProd = mode === 'production';

  if (!dsn) {
    if (isProd) console.warn('[Sentry] VITE_SENTRY_DSN not configured — error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn,
    environment: mode,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: isProd ? 0.1 : 1.0,
    attachStacktrace: true,
    sendDefaultPii: false,

    beforeSend(event) {
      // Strip sensitive request data before sending
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
      }
      return event;
    },

    ignoreErrors: [
      // Browser extensions / framework chrome
      'top.GLOBALS',
      'canvas.contentDocument',
      // Expected network failures (offline, user navigated away)
      'Network request failed',
      'NetworkError',
      'AbortError',
      // Vite HMR chunk-load misses on deploy
      'Loading chunk',
      'Failed to fetch dynamically imported module',
    ],
  });
};

/** Capture an error to Sentry with optional structured context. */
export const captureError = (error: Error, context?: Record<string, unknown>): void => {
  Sentry.captureException(error, context ? { extra: context } : undefined);
};

/** Attach the current user to subsequent error reports. */
export const setUserContext = (user: { id: string; email?: string; name?: string }): void => {
  Sentry.setUser(user);
};

/** Clear user context on logout. */
export const clearUserContext = (): void => {
  Sentry.setUser(null);
};

/** Add a breadcrumb (chronological trail leading up to an error). */
export const addBreadcrumb = (message: string, data?: Record<string, unknown>): void => {
  Sentry.addBreadcrumb({
    message,
    data,
    level: 'info',
    timestamp: Date.now() / 1000,
  });
};
