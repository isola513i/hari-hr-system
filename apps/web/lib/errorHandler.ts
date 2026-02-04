import { ToastType } from '../contexts/ToastContext';
import { NetworkError, ApiErrorResponse } from '../types';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Parse error from API response
 */
export const parseApiError = (error: NetworkError | Error): ApiError => {
  // Network error (no response)
  if (!('response' in error) || !error.response) {
    if (error.message === 'Network Error') {
      return {
        message: 'Unable to connect to the server. Please check your internet connection.',
        status: 0,
        code: 'NETWORK_ERROR',
      };
    }
    return {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
    };
  }

  // HTTP error with response
  const { status, data } = error.response;

  // Helper to safely extract error message
  const getErrorMessage = (data: ApiErrorResponse | Record<string, unknown>): string | undefined => {
    if ('error' in data && typeof data.error === 'string') {
      return data.error;
    }
    return undefined;
  };

  // Handle different status codes
  switch (status) {
    case 400:
      return {
        message: getErrorMessage(data) || 'Invalid request. Please check your input.',
        status,
        code: 'BAD_REQUEST',
        details: data as Record<string, unknown>,
      };

    case 401:
      return {
        message: 'Your session has expired. Please log in again.',
        status,
        code: 'UNAUTHORIZED',
      };

    case 403:
      return {
        message: 'You don\'t have permission to perform this action.',
        status,
        code: 'FORBIDDEN',
      };

    case 404:
      return {
        message: getErrorMessage(data) || 'The requested resource was not found.',
        status,
        code: 'NOT_FOUND',
      };

    case 409:
      return {
        message: getErrorMessage(data) || 'This resource already exists.',
        status,
        code: 'CONFLICT',
      };

    case 422:
      return {
        message: getErrorMessage(data) || 'Validation failed. Please check your input.',
        status,
        code: 'VALIDATION_ERROR',
        details: data as Record<string, unknown>,
      };

    case 429:
      return {
        message: 'Too many requests. Please try again later.',
        status,
        code: 'RATE_LIMIT',
      };

    case 500:
      return {
        message: 'Server error. Our team has been notified.',
        status,
        code: 'SERVER_ERROR',
      };

    case 503:
      return {
        message: 'Service temporarily unavailable. Please try again later.',
        status,
        code: 'SERVICE_UNAVAILABLE',
      };

    default:
      return {
        message: getErrorMessage(data) || `An error occurred (${status})`,
        status,
        code: 'HTTP_ERROR',
        details: data as Record<string, unknown>,
      };
  }
};

/**
 * Get toast type based on error status
 */
export const getErrorToastType = (error: ApiError): ToastType => {
  if (!error.status) return 'error';

  if (error.status >= 500) return 'error';
  if (error.status === 429) return 'warning';
  if (error.status >= 400) return 'warning';

  return 'error';
};

/**
 * Handle API error and show appropriate toast
 */
export const handleApiError = (
  error: NetworkError | Error,
  showToast: (message: string, type: ToastType) => void,
  customMessage?: string
): ApiError => {
  const apiError = parseApiError(error);
  const message = customMessage || apiError.message;
  const toastType = getErrorToastType(apiError);

  showToast(message, toastType);

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('API Error:', apiError);
  }

  // Redirect to login if unauthorized
  if (apiError.code === 'UNAUTHORIZED') {
    setTimeout(() => {
      localStorage.removeItem('token');
      window.location.href = '/#/login';
    }, 2000);
  }

  return apiError;
};

/**
 * Retry mechanism for failed requests
 */
export const retryRequest = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
  onRetry?: (attempt: number) => void
): Promise<T> => {
  let lastError: NetworkError | Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const typedError = error as NetworkError | Error;
      lastError = typedError;

      // Don't retry on client errors (4xx)
      if ('response' in typedError && typedError.response) {
        const responseStatus = typedError.response.status;
        if (responseStatus >= 400 && responseStatus < 500) {
          throw typedError;
        }
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw typedError;
      }

      // Notify about retry
      if (onRetry) {
        onRetry(attempt);
      }

      // Exponential backoff
      const waitTime = delay * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
};

/**
 * Validate form fields and return error messages
 */
export const validateField = (
  fieldName: string,
  value: unknown,
  rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: string | number) => string | null;
  }
): string | null => {
  // Convert value to string for validation
  const stringValue = value != null ? String(value) : '';

  // Required check
  if (rules.required && (!value || stringValue.trim() === '')) {
    return `${fieldName} is required`;
  }

  // Skip other validations if value is empty and not required
  if (!value) return null;

  // Min length check
  if (rules.minLength && stringValue.length < rules.minLength) {
    return `${fieldName} must be at least ${rules.minLength} characters`;
  }

  // Max length check
  if (rules.maxLength && stringValue.length > rules.maxLength) {
    return `${fieldName} must be at most ${rules.maxLength} characters`;
  }

  // Pattern check
  if (rules.pattern && !rules.pattern.test(stringValue)) {
    return `${fieldName} format is invalid`;
  }

  // Custom validation
  if (rules.custom && (typeof value === 'string' || typeof value === 'number')) {
    return rules.custom(value);
  }

  return null;
};

/**
 * Common validation patterns
 */
export const ValidationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/,
  url: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  alpha: /^[a-zA-Z]+$/,
  numeric: /^[0-9]+$/,
};
