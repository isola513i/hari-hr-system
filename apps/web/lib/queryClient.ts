import { QueryClient } from '@tanstack/react-query';

const shouldRetry = (failureCount: number, error: unknown): boolean => {
  if (failureCount >= 2) return false;
  if (error instanceof Error) {
    const msg = error.message;
    // Don't retry client errors (auth, not found, validation)
    if (msg.includes('401') || msg.includes('403') || msg.includes('404') || msg.includes('400')) return false;
  }
  return true;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: true,
      retry: shouldRetry,
    },
    mutations: {
      retry: false,
    },
  },
});
