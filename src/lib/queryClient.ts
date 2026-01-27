import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds - data is fresh for 30s
      gcTime: 1000 * 60 * 5, // 5 minutes - keep in cache for 5 min after becoming inactive
      refetchOnWindowFocus: true,
      retry: 1,
      refetchOnMount: true,
    },
  },
});
