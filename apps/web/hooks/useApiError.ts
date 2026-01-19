import { useToast } from '../contexts/ToastContext';
import { handleApiError, retryRequest } from '../lib/errorHandler';

/**
 * Hook for handling API errors with toast notifications
 */
export const useApiError = () => {
  const { showToast } = useToast();

  /**
   * Handle API error and show toast
   */
  const handleError = (error: any, customMessage?: string) => {
    return handleApiError(error, showToast, customMessage);
  };

  /**
   * Execute async function with error handling
   */
  const withErrorHandling = async <T>(
    fn: () => Promise<T>,
    customErrorMessage?: string
  ): Promise<T | null> => {
    try {
      return await fn();
    } catch (error) {
      handleError(error, customErrorMessage);
      return null;
    }
  };

  /**
   * Execute async function with retry and error handling
   */
  const withRetry = async <T>(
    fn: () => Promise<T>,
    options?: {
      maxRetries?: number;
      delay?: number;
      customErrorMessage?: string;
    }
  ): Promise<T | null> => {
    try {
      return await retryRequest(
        fn,
        options?.maxRetries,
        options?.delay,
        (attempt) => {
          showToast(`Retrying... (Attempt ${attempt})`, 'info', 2000);
        }
      );
    } catch (error) {
      handleError(error, options?.customErrorMessage);
      return null;
    }
  };

  return {
    handleError,
    withErrorHandling,
    withRetry,
  };
};
