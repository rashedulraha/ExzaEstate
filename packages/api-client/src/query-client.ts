import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a QueryClient instance configured with ExzaEstate enterprise defaults.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 2, // 2 minutes data freshness
        gcTime: 1000 * 60 * 10, // 10 minutes garbage collection time
        refetchOnWindowFocus: false,
        retry: (failureCount, error: unknown) => {
          // Never retry on 4xx client errors (400, 401, 403, 404, 409, 426)
          const status = (error as { status?: number })?.status;
          if (status && status >= 400 && status < 500) {
            return false;
          }
          // Retry at most 2 times for transient network/5xx errors
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export const queryClient = createQueryClient();
