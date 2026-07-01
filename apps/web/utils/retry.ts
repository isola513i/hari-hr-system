/**
 * Retry configuration options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial delay between retries in milliseconds */
  initialDelay?: number;
  /** Maximum delay between retries in milliseconds */
  maxDelay?: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier?: number;
  /** HTTP status codes that should trigger a retry */
  retryableStatusCodes?: number[];
  /** HTTP methods that are safe to retry */
  retryableMethods?: string[];
  /** Callback called before each retry attempt */
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Default retry configuration
 */
const defaultRetryOptions: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  // Only retry on network errors or specific status codes
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  // Only retry safe methods (GET is idempotent)
  retryableMethods: ['GET'],
  onRetry: () => {},
};

/**
 * Calculate delay for exponential backoff with jitter
 */
const calculateDelay = (
  attempt: number,
  initialDelay: number,
  maxDelay: number,
  multiplier: number
): number => {
  const exponentialDelay = initialDelay * Math.pow(multiplier, attempt);
  const cappedDelay = Math.min(exponentialDelay, maxDelay);

  // Add jitter (random value between 0 and delay/2) to prevent thundering herd
  const jitter = Math.random() * cappedDelay * 0.5;

  return cappedDelay + jitter;
};

/**
 * Check if an error is retryable
 */
const isRetryableError = (
  error: unknown,
  method: string,
  options: Required<RetryOptions>
): boolean => {
  // Check if method is retryable
  if (!options.retryableMethods.includes(method.toUpperCase())) {
    return false;
  }

  const err = error as { response?: { status?: number }; message?: string };

  // Network errors (no response) are retryable
  if (!err.response && err.message?.includes('fetch')) {
    return true;
  }

  // Check if status code is retryable
  if (err.response?.status) {
    return options.retryableStatusCodes.includes(err.response.status);
  }

  return false;
};

/**
 * Retry a function with exponential backoff
 *
 * @example
 * const result = await retryWithBackoff(
 *   () => fetch('/api/data'),
 *   { maxRetries: 3, onRetry: (attempt) => console.log(`Retry ${attempt}`) }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...defaultRetryOptions, ...options };
  let lastError: Error;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // If this is the last attempt, throw the error
      if (attempt === config.maxRetries) {
        throw error;
      }

      // Check if error is retryable
      if (!isRetryableError(error, 'GET', config)) {
        throw error;
      }

      // Calculate delay before retry
      const delay = calculateDelay(
        attempt,
        config.initialDelay,
        config.maxDelay,
        config.backoffMultiplier
      );

      // Call onRetry callback
      config.onRetry(attempt + 1, error as Error);

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

/**
 * Retry a fetch request with exponential backoff
 *
 * @example
 * const data = await retryFetch('/api/data', {
 *   method: 'GET',
 *   headers: { 'Authorization': 'Bearer token' }
 * });
 */
export async function retryFetch(
  url: string,
  fetchOptions: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const method = fetchOptions.method || 'GET';
  const config = { ...defaultRetryOptions, ...retryOptions };

  return retryWithBackoff(
    async () => {
      const response = await fetch(url, fetchOptions);

      // Check if response status is retryable
      if (
        !response.ok &&
        config.retryableStatusCodes.includes(response.status)
      ) {
        const error: Error & { response?: { status: number } } = new Error(`HTTP ${response.status}`);
        error.response = { status: response.status };
        throw error;
      }

      return response;
    },
    {
      ...config,
      retryableMethods: [method.toUpperCase()],
    }
  );
}

/**
 * Create a retry wrapper for a function
 *
 * @example
 * const apiCall = retryable(
 *   (id: string) => fetch(`/api/users/${id}`).then(r => r.json()),
 *   { maxRetries: 3 }
 * );
 * const user = await apiCall('123');
 */
export function retryable<TArgs extends any[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => retryWithBackoff(() => fn(...args), options);
}
