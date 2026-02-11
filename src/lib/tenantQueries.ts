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
