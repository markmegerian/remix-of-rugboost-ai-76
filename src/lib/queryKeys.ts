// Centralized query key management for React Query
// All keys are scoped by companyId for proper tenant isolation

export const queryKeys = {
  // Jobs
  jobs: {
    all: (companyId: string | null) => ['jobs', companyId] as const,
    list: (companyId: string | null) => [...queryKeys.jobs.all(companyId), 'list'] as const,
    detail: (companyId: string | null, id: string) => [...queryKeys.jobs.all(companyId), 'detail', id] as const,
    rugs: (companyId: string | null, jobId: string) => [...queryKeys.jobs.all(companyId), 'rugs', jobId] as const,
  },
  
  // User/Profile data
  user: {
    all: (companyId: string | null) => ['user', companyId] as const,
    profile: (companyId: string | null, userId: string) => [...queryKeys.user.all(companyId), 'profile', userId] as const,
    branding: (companyId: string | null, userId: string) => [...queryKeys.user.all(companyId), 'branding', userId] as const,
    servicePrices: (companyId: string | null, userId: string) => [...queryKeys.user.all(companyId), 'prices', userId] as const,
  },
  
  // Job-related data
  estimates: {
    all: (companyId: string | null) => ['estimates', companyId] as const,
    byJob: (companyId: string | null, jobId: string) => [...queryKeys.estimates.all(companyId), 'job', jobId] as const,
  },
  
  payments: {
    all: (companyId: string | null) => ['payments', companyId] as const,
    byJob: (companyId: string | null, jobId: string) => [...queryKeys.payments.all(companyId), 'job', jobId] as const,
  },
  
  completions: {
    all: (companyId: string | null) => ['completions', companyId] as const,
    byJob: (companyId: string | null, jobId: string) => [...queryKeys.completions.all(companyId), 'job', jobId] as const,
  },
  
  clientPortal: {
    all: (companyId: string | null) => ['clientPortal', companyId] as const,
    byJob: (companyId: string | null, jobId: string) => [...queryKeys.clientPortal.all(companyId), 'job', jobId] as const,
  },
  
  // Analytics
  analytics: {
    all: (companyId: string | null) => ['analytics', companyId] as const,
    byRange: (companyId: string | null, range: string) => [...queryKeys.analytics.all(companyId), range] as const,
  },
  
  // History
  history: {
    all: (companyId: string | null) => ['history', companyId] as const,
    list: (companyId: string | null) => [...queryKeys.history.all(companyId), 'list'] as const,
  },
  
  // Notifications
  notifications: {
    all: (companyId: string | null) => ['notifications', companyId] as const,
    unread: (companyId: string | null, userId: string) => [...queryKeys.notifications.all(companyId), 'unread', userId] as const,
  },

  // Clients
  clients: {
    all: (companyId: string | null) => ['clients', companyId] as const,
    search: (companyId: string | null, query: string) => [...queryKeys.clients.all(companyId), 'search', query] as const,
  },
} as const;
