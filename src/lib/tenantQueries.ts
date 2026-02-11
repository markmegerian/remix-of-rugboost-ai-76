// Tenant-scoped query helpers for multi-tenant data access
// All business data queries should use these helpers to ensure proper isolation

/**
 * Add company_id filter to a Supabase query
 * Use this for all tenant-scoped data fetching
 */
export const withCompanyScope = <T extends { eq: (column: string, value: string) => T }>(
  query: T,
  companyId: string | null
): T => {
  if (!companyId) {
    console.error('withCompanyScope called without companyId — query will not be scoped');
    throw new Error('Company context required for this query');
  }
  return query.eq('company_id', companyId);
};

/**
 * Prepare insert data with company_id
 * Use this when inserting new records
 */
export const withCompanyInsert = <T extends Record<string, unknown>>(
  data: T,
  companyId: string | null
): T & { company_id: string | null } => {
  return {
    ...data,
    company_id: companyId,
  };
};

/**
 * Validate that a record belongs to the current company
 * Use this for additional security checks
 */
export const belongsToCompany = (
  record: { company_id?: string | null } | null,
  companyId: string | null
): boolean => {
  if (!record) return false;
  if (!companyId) return false; // Fail closed — no company context means no access
  return record.company_id === companyId;
};

/**
 * Query keys factory for tenant-scoped queries
 * Extends existing queryKeys with company context
 */
export const tenantQueryKeys = {
  // Company-scoped jobs
  jobs: {
    all: (companyId: string | null) => ['jobs', companyId] as const,
    list: (companyId: string | null) => [...tenantQueryKeys.jobs.all(companyId), 'list'] as const,
    detail: (companyId: string | null, jobId: string) => 
      [...tenantQueryKeys.jobs.all(companyId), 'detail', jobId] as const,
  },
  
  // Company-scoped inspections
  inspections: {
    all: (companyId: string | null) => ['inspections', companyId] as const,
    byJob: (companyId: string | null, jobId: string) => 
      [...tenantQueryKeys.inspections.all(companyId), 'job', jobId] as const,
  },
  
  // Company-scoped pricing
  servicePrices: {
    all: (companyId: string | null) => ['service-prices', companyId] as const,
    list: (companyId: string | null) => 
      [...tenantQueryKeys.servicePrices.all(companyId), 'list'] as const,
  },
  
  // Company branding
  branding: {
    all: (companyId: string | null) => ['branding', companyId] as const,
  },
  
  // Company email templates
  emailTemplates: {
    all: (companyId: string | null) => ['email-templates', companyId] as const,
    list: (companyId: string | null) => 
      [...tenantQueryKeys.emailTemplates.all(companyId), 'list'] as const,
  },
  
  // Company analytics
  analytics: {
    all: (companyId: string | null) => ['analytics', companyId] as const,
    byRange: (companyId: string | null, range: string) => 
      [...tenantQueryKeys.analytics.all(companyId), range] as const,
  },
} as const;
