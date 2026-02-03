import { useState, useEffect, useCallback, useRef } from 'react';

interface UseApiOptions<T> {
  initialData?: T;
  enabled?: boolean;
  refetchInterval?: number;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseApiResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isRefetching: boolean;
  refetch: () => Promise<void>;
}

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export function useApi<T>(
  url: string,
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const {
    initialData,
    enabled = true,
    refetchInterval,
    onSuccess,
    onError,
  } = options;

  const [data, setData] = useState<T | undefined>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefetching, setIsRefetching] = useState(false);
  const mountedRef = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async (isRefetch = false) => {
    if (!enabled) return;

    // Check cache first
    const cached = cache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL && !isRefetch) {
      setData(cached.data as T);
      setIsLoading(false);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (isRefetch) {
      setIsRefetching(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(url, {
        signal: abortControllerRef.current.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (mountedRef.current) {
        setData(result);
        cache.set(url, { data: result, timestamp: Date.now() });
        onSuccess?.(result);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      if (mountedRef.current) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        onError?.(error);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsRefetching(false);
      }
    }
  }, [url, enabled, onSuccess, onError]);

  const refetch = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData]);

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(() => {
      fetchData(true);
    }, refetchInterval);

    return () => clearInterval(interval);
  }, [refetchInterval, enabled, fetchData]);

  return { data, error, isLoading, isRefetching, refetch };
}

// Mutation hook for POST/PUT/DELETE
interface UseMutationOptions<TData, TVariables> {
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
  invalidateUrls?: string[];
}

interface UseMutationResult<TData, TVariables> {
  mutate: (variables: TVariables) => Promise<TData | undefined>;
  data: TData | undefined;
  error: Error | null;
  isLoading: boolean;
  reset: () => void;
}

export function useMutation<TData, TVariables extends { url: string; method?: string; body?: unknown }>(
  options: UseMutationOptions<TData, TVariables> = {}
): UseMutationResult<TData, TVariables> {
  const { onSuccess, onError, invalidateUrls = [] } = options;

  const [data, setData] = useState<TData | undefined>(undefined);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const mutate = useCallback(async (variables: TVariables): Promise<TData | undefined> => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(variables.url, {
        method: variables.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: variables.body ? JSON.stringify(variables.body) : undefined,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setData(result);

      // Invalidate cache for related URLs
      invalidateUrls.forEach(url => {
        for (const key of cache.keys()) {
          if (key.includes(url)) {
            cache.delete(key);
          }
        }
      });

      onSuccess?.(result, variables);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error, variables);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [onSuccess, onError, invalidateUrls]);

  const reset = useCallback(() => {
    setData(undefined);
    setError(null);
    setIsLoading(false);
  }, []);

  return { mutate, data, error, isLoading, reset };
}

// Clear all cache
export function clearApiCache(): void {
  cache.clear();
}

// Clear specific cache entry
export function invalidateApiCache(urlPattern: string): void {
  for (const key of cache.keys()) {
    if (key.includes(urlPattern)) {
      cache.delete(key);
    }
  }
}
