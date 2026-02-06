import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute - data is fresh for 1 min (increased from 30s)
      gcTime: 1000 * 60 * 10, // 10 minutes - keep in cache for 10 min after becoming inactive
      refetchOnWindowFocus: false, // Disable auto-refetch on focus to reduce network calls
      retry: 1,
      refetchOnMount: 'always', // Only refetch if stale
    },
  },
});
