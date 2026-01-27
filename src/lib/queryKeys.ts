// Centralized query key management for React Query
// This ensures consistency and makes cache invalidation easier

export const queryKeys = {
  // Jobs
  jobs: {
    all: ['jobs'] as const,
    list: () => [...queryKeys.jobs.all, 'list'] as const,
    detail: (id: string) => [...queryKeys.jobs.all, 'detail', id] as const,
    rugs: (jobId: string) => [...queryKeys.jobs.all, 'rugs', jobId] as const,
  },
  
  // User/Profile data
  user: {
    all: ['user'] as const,
    profile: (userId: string) => [...queryKeys.user.all, 'profile', userId] as const,
    branding: (userId: string) => [...queryKeys.user.all, 'branding', userId] as const,
    servicePrices: (userId: string) => [...queryKeys.user.all, 'prices', userId] as const,
  },
  
  // Job-related data
  estimates: {
    all: ['estimates'] as const,
    byJob: (jobId: string) => [...queryKeys.estimates.all, 'job', jobId] as const,
  },
  
  payments: {
    all: ['payments'] as const,
    byJob: (jobId: string) => [...queryKeys.payments.all, 'job', jobId] as const,
  },
  
  completions: {
    all: ['completions'] as const,
    byJob: (jobId: string) => [...queryKeys.completions.all, 'job', jobId] as const,
  },
  
  clientPortal: {
    all: ['clientPortal'] as const,
    byJob: (jobId: string) => [...queryKeys.clientPortal.all, 'job', jobId] as const,
  },
  
  // Analytics
  analytics: {
    all: ['analytics'] as const,
    byRange: (range: string) => [...queryKeys.analytics.all, range] as const,
  },
  
  // History
  history: {
    all: ['history'] as const,
    list: () => [...queryKeys.history.all, 'list'] as const,
  },
  
  // Notifications
  notifications: {
    all: ['notifications'] as const,
    unread: () => [...queryKeys.notifications.all, 'unread'] as const,
  },
} as const;
