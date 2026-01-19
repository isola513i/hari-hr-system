import { ToastType } from '../contexts/ToastContext';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

/**
 * Parse error from API response
 */
export const parseApiError = (error: any): ApiError => {
  // Network error (no response)
  if (!error.response) {
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

  // Handle different status codes
  switch (status) {
    case 400:
      return {
        message: data?.error || 'Invalid request. Please check your input.',
        status,
        code: 'BAD_REQUEST',
        details: data,
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
        message: data?.error || 'The requested resource was not found.',
        status,
        code: 'NOT_FOUND',
      };

    case 409:
      return {
        message: data?.error || 'This resource already exists.',
        status,
        code: 'CONFLICT',
      };

    case 422:
      return {
        message: data?.error || 'Validation failed. Please check your input.',
        status,
        code: 'VALIDATION_ERROR',
        details: data,
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
        message: data?.error || `An error occurred (${status})`,
        status,
        code: 'HTTP_ERROR',
        details: data,
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
  error: any,
  showToast: (message: string, type: ToastType) => void,
  customMessage?: string
) => {
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
      window.location.href = '/login';
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
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
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
  value: any,
  rules: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    custom?: (value: any) => string | null;
  }
): string | null => {
  // Required check
  if (rules.required && (!value || value.toString().trim() === '')) {
    return `${fieldName} is required`;
  }

  // Skip other validations if value is empty and not required
  if (!value) return null;

  // Min length check
  if (rules.minLength && value.toString().length < rules.minLength) {
    return `${fieldName} must be at least ${rules.minLength} characters`;
  }

  // Max length check
  if (rules.maxLength && value.toString().length > rules.maxLength) {
    return `${fieldName} must be at most ${rules.maxLength} characters`;
  }

  // Pattern check
  if (rules.pattern && !rules.pattern.test(value.toString())) {
    return `${fieldName} format is invalid`;
  }

  // Custom validation
  if (rules.custom) {
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
