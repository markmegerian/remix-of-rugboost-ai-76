import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
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
  const [company, setCompany] = useState<Company | null>(null);
  const [branding, setBranding] = useState<CompanyBranding | null>(null);
  const [membership, setMembership] = useState<CompanyMembership | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCompanyData = async () => {
    if (!user) {
      setCompany(null);
      setBranding(null);
      setMembership(null);
      setLoading(false);
      return;
    }

    // Only fetch company data for staff/admin users
    if (!isStaff && !isAdmin) {
      setLoading(false);
      return;
    }

    try {
      // Fetch user's company membership
      const { data: membershipData, error: membershipError } = await supabase
        .from('company_memberships')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError) {
        console.error('Error fetching company membership:', membershipError);
        setLoading(false);
        return;
      }

      if (!membershipData) {
        // User has no company yet
        setMembership(null);
        setCompany(null);
        setBranding(null);
        setLoading(false);
        return;
      }

      setMembership(membershipData as CompanyMembership);

      // Fetch company details
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', membershipData.company_id)
        .single();

      if (companyError) {
        console.error('Error fetching company:', companyError);
      } else {
        setCompany(companyData as Company);
      }

      // Fetch branding
      const { data: brandingData, error: brandingError } = await supabase
        .from('company_branding')
        .select('*')
        .eq('company_id', membershipData.company_id)
        .maybeSingle();

      if (brandingError) {
        console.error('Error fetching branding:', brandingError);
      } else {
        setBranding(brandingData as CompanyBranding | null);
      }
    } catch (err) {
      console.error('Error in fetchCompanyData:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchCompanyData();
    }
  }, [user, authLoading, isStaff, isAdmin]);

  const companyId = membership?.company_id || null;
  const companyRole = membership?.role || null;
  const isCompanyAdmin = companyRole === 'company_admin';
  const hasCompany = !!companyId;

  return (
    <CompanyContext.Provider
      value={{
        company,
        companyId,
        companyRole,
        branding,
        membership,
        loading: loading || authLoading,
        isCompanyAdmin,
        hasCompany,
        refetchCompany: fetchCompanyData,
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
