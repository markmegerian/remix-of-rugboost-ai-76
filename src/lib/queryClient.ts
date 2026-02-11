import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error: any, query) => {
      // Handle auth expiration globally
      if (error?.status === 401 || error?.message?.includes('JWT expired') || error?.message?.includes('invalid claim: missing sub claim')) {
        window.location.href = '/auth';
        return;
      }
      console.error('Query error:', error, 'Query key:', query.queryKey);
    },
  }),
  mutationCache: new MutationCache({
    onError: (error: any) => {
      if (error?.status === 401 || error?.message?.includes('JWT expired')) {
        window.location.href = '/auth';
        return;
      }
      console.error('Mutation error:', error);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      gcTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
      refetchOnMount: true,
    },
  },
});
