import { captureError, addBreadcrumb } from '../config/sentry';
import { trackEvent } from '../lib/analytics';

/**
 * Error logging service
 * Centralizes error logging for the application
 */

interface ErrorContext {
  userId?: string;
  page?: string;
  action?: string;
  [key: string]: unknown;
}

class ErrorLoggingService {
  /**
   * Log an error with context
   */
  logError(error: Error, context?: ErrorContext): void {
    const errorData = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      ...context,
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorData);
    }

    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Send to Sentry
      captureError(error, context);
      // Also send to backend for logging
      this.sendToBackend(errorData);
    }
  }

  /**
   * Log a warning (non-critical issue)
   */
  logWarning(message: string, context?: ErrorContext): void {
    const warningData = {
      level: 'warning',
      message,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      ...context,
    };

    console.warn('Warning:', warningData);

    if (process.env.NODE_ENV === 'production') {
      this.sendToBackend(warningData);
    }
  }

  /**
   * Log an info message (for tracking user actions)
   */
  logInfo(message: string, context?: ErrorContext): void {
    const infoData = {
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context,
    };

    if (process.env.NODE_ENV === 'development') {
      console.log('Info:', infoData);
    }
  }

  /**
   * Send error data to backend for logging
   */
  private async sendToBackend(data: unknown): Promise<void> {
    try {
      await fetch('/api/logs/client-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } catch {
      // Silently fail — don't let logging errors break the app
    }
  }

  /**
   * Track a user action for analytics
   */
  trackAction(action: string, properties?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      console.log('Action tracked:', action, properties);
    }

    // Add breadcrumb to Sentry for context
    addBreadcrumb(action, properties);

    // Send to Google Analytics (no-op if VITE_GA_MEASUREMENT_ID is not set)
    trackEvent(action, properties);
  }
}

export const errorLogging = new ErrorLoggingService();
export default errorLogging;
