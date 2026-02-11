import { createContext, useContext, ReactNode, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { PlanTier, BillingStatus } from '@/lib/planFeatures';

type CompanyRole = 'company_admin' | 'staff';

interface Company {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  payment_account_connected: boolean;
  stripe_account_id: string | null;
  settings: Record<string, unknown>;
  plan_tier: PlanTier;
  billing_status: BillingStatus;
  trial_ends_at: string | null;
  max_staff_users: number;
  created_at: string;
  updated_at: string;
}

interface CompanyBranding {
  id: string;
  company_id: string;
  business_name: string | null;
  business_email: string | null;
  business_phone: string | null;
  business_address: string | null;
  logo_path: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
}

interface CompanyMembership {
  id: string;
  company_id: string;
  user_id: string;
  role: CompanyRole;
  created_at: string;
}

interface CompanyData {
  company: Company | null;
  branding: CompanyBranding | null;
  membership: CompanyMembership | null;
}

interface CompanyContextType {
  company: Company | null;
  companyId: string | null;
  companyRole: CompanyRole | null;
  branding: CompanyBranding | null;
  membership: CompanyMembership | null;
  loading: boolean;
  isCompanyAdmin: boolean;
  hasCompany: boolean;
  refetchCompany: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading, isStaff, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: companyData, isLoading } = useQuery<CompanyData>({
    queryKey: ['company', user?.id],
    queryFn: async (): Promise<CompanyData> => {
      if (!user) {
        return { company: null, branding: null, membership: null };
      }

      // Only fetch company data for staff/admin users
      if (!isStaff && !isAdmin) {
        return { company: null, branding: null, membership: null };
      }

      // Fetch user's company membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('company_memberships')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError) {
        console.error('Error fetching company membership:', membershipError);
        return { company: null, branding: null, membership: null };
      }

      if (!membershipData) {
        return { company: null, branding: null, membership: null };
      }

      const membership = membershipData as CompanyMembership;

      // Fetch company and branding in parallel
      const [companyResult, brandingResult] = await Promise.all([
        supabase
          .from('companies')
          .select('*')
          .eq('id', membership.company_id)
          .single(),
        supabase
          .from('company_branding')
          .select('*')
          .eq('company_id', membership.company_id)
          .maybeSingle(),
      ]);

      if (companyResult.error) {
        console.error('Error fetching company:', companyResult.error);
      }

      if (brandingResult.error) {
        console.error('Error fetching branding:', brandingResult.error);
      }

      return {
        company: (companyResult.data as Company) ?? null,
        branding: (brandingResult.data as CompanyBranding) ?? null,
        membership,
      };
    },
    enabled: !!user && !authLoading && (isStaff || isAdmin),
    staleTime: 1000 * 60 * 10, // 10 min stale time — company data rarely changes
    gcTime: 1000 * 60 * 30,    // Keep in cache for 30 min
  });

  const company = companyData?.company ?? null;
  const branding = companyData?.branding ?? null;
  const membership = companyData?.membership ?? null;
  const loading = isLoading || authLoading;

  const companyId = membership?.company_id || null;
  const companyRole = membership?.role || null;
  const isCompanyAdmin = companyRole === 'company_admin';
  const hasCompany = !!companyId;

  const refetchCompany = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['company', user?.id] });
  }, [queryClient, user?.id]);

  return (
    <CompanyContext.Provider
      value={{
        company,
        companyId,
        companyRole,
        branding,
        membership,
        loading,
        isCompanyAdmin,
        hasCompany,
        refetchCompany,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

// Hook for tenant-scoped queries
export const useCompanyScope = () => {
  const { companyId } = useCompany();
  
  return {
    companyId,
    // Helper to add company_id filter to queries
    withCompanyId: <T extends { company_id?: string | null }>(data: T): T => ({
      ...data,
      company_id: companyId,
    }),
    // Check if we have a valid company context
    isReady: !!companyId,
  };
};
