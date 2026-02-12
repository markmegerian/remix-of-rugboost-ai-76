import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { batchSignUrls } from '@/hooks/useSignedUrls';
import { useCompany } from './useCompany';
import { validateTenantAccess } from './useLifecycleGuards';
import { DEFAULT_SERVICES, DEFAULT_VARIABLE_SERVICES } from '@/lib/defaultServices';

export interface JobDetail {
  id: string;
  job_number: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
  notes: string | null;
  status: string;
  created_at: string;
  client_approved_at?: string | null;
  payment_status?: string;
  company_id?: string | null;
}

export interface Rug {
  id: string;
  rug_number: string;
  rug_type: string;
  length: number | null;
  width: number | null;
  notes: string | null;
  photo_urls: string[] | null;
  analysis_report: string | null;
  image_annotations: unknown;
  system_services: unknown;
  created_at: string;
  estimate_approved?: boolean;
  company_id?: string | null;
}

export interface ApprovedEstimate {
  id: string;
  inspection_id: string;
  services: any[];
  total_amount: number;
}

export interface Payment {
  id: string;
  status: string;
  amount: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  metadata: any;
}

export interface ClientPortalStatus {
  accessToken: string;
  emailSentAt: string | null;
  emailError: string | null;
  firstAccessedAt: string | null;
  passwordSetAt: string | null;
  hasClientAccount: boolean;
  hasServiceSelections: boolean;
  serviceSelectionsAt: string | null;
}

export interface ServicePrice {
  name: string;
  unitPrice: number;
}

export interface UpsellService {
  name: string;
  unitPrice: number;
}

export interface BusinessBranding {
  business_name: string | null;
  business_address: string | null;
  business_phone: string | null;
  business_email: string | null;
  logo_path: string | null;
}

// Fetch all job detail data in parallel with tenant isolation
export const useJobDetail = (jobId: string | undefined, userId: string | undefined) => {
  const { companyId, loading: companyLoading } = useCompany();

  return useQuery({
    queryKey: queryKeys.jobs.detail(companyId, jobId || ''),
    queryFn: async () => {
      if (!jobId || !userId) throw new Error('Missing jobId or userId');

      // Parallel fetch all data
      const [
        jobResult,
        rugsResult,
        brandingResult,
        pricesResult,
        estimatesResult,
        paymentsResult,
        portalResult,
        enabledServicesResult,
      ] = await Promise.all([
        supabase
          .from('jobs')
          .select('*, company_id')
          .eq('id', jobId)
          .maybeSingle(),
        supabase
          .from('inspections')
          .select('*, company_id')
          .eq('job_id', jobId)
          .order('created_at', { ascending: true }),
        companyId 
          ? supabase
              .from('company_branding')
              .select('business_name, business_address, business_phone, business_email, logo_path')
              .eq('company_id', companyId)
              .maybeSingle()
          : supabase
              .from('profiles')
              .select('business_name, business_address, business_phone, business_email, logo_path')
              .eq('user_id', userId)
              .maybeSingle(),
        companyId
          ? supabase
              .from('company_service_prices')
              .select('service_name, unit_price, is_additional')
              .eq('company_id', companyId)
          : supabase
              .from('service_prices')
              .select('service_name, unit_price, is_additional')
              .eq('user_id', userId),
        supabase
          .from('approved_estimates')
          .select('id, inspection_id, services, total_amount')
          .eq('job_id', jobId),
        supabase
          .from('payments')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false }),
        supabase
          .from('client_job_access')
          .select(`
            id,
            access_token,
            email_sent_at,
            email_error,
            first_accessed_at,
            password_set_at,
            client_id,
            company_id
          `)
          .eq('job_id', jobId)
          .maybeSingle(),
        companyId
          ? supabase
              .from('company_enabled_services')
              .select('service_name, is_enabled')
              .eq('company_id', companyId)
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (jobResult.error) throw jobResult.error;
      if (!jobResult.data) throw new Error('Job not found');

      const job = jobResult.data as JobDetail;
      if (companyId && job.company_id) {
        const tenantCheck = validateTenantAccess(job.company_id, companyId);
        if (!tenantCheck.valid) {
          throw new Error(tenantCheck.error);
        }
      }

      // Build enabled-services filter
      const enabledRows = enabledServicesResult?.data || [];
      const hasEnabledConfig = enabledRows.length > 0;
      const enabledSet = hasEnabledConfig
        ? new Set(enabledRows.filter(r => r.is_enabled).map(r => r.service_name))
        : null; // null = no config, show all

      const isServiceEnabled = (name: string) => !enabledSet || enabledSet.has(name);

      const fetchedPrices = (pricesResult.data || [])
        .filter(p => !p.is_additional);
      
      // Fall back to default service catalog when no prices are configured
      const servicePrices: ServicePrice[] = fetchedPrices.length > 0
        ? fetchedPrices
            .filter(p => isServiceEnabled(p.service_name))
            .map(p => ({ name: p.service_name, unitPrice: p.unit_price }))
        : DEFAULT_SERVICES
            .filter(isServiceEnabled)
            .map(name => ({ name, unitPrice: 0 }));

      // Include enabled variable-price services (is_additional=true) with unitPrice=0
      const enabledVariableServices = (pricesResult.data || [])
        .filter(p => p.is_additional);
      
      const variableServicePrices: ServicePrice[] = enabledVariableServices.length > 0
        ? enabledVariableServices
            .filter(p => isServiceEnabled(p.service_name))
            .map(p => ({ name: p.service_name, unitPrice: 0 }))
        : DEFAULT_VARIABLE_SERVICES
            .filter(isServiceEnabled)
            .map(name => ({ name, unitPrice: 0 }));

      // Combine fixed + variable for the full available services list
      const allServicePrices = [...servicePrices, ...variableServicePrices];

      const upsellServices: UpsellService[] = (pricesResult.data || [])
        .filter(p => p.is_additional)
        .map(p => ({ name: p.service_name, unitPrice: p.unit_price }));

      const approvedEstimates: ApprovedEstimate[] = (estimatesResult.data || []).map(ae => ({
        ...ae,
        services: Array.isArray(ae.services) ? ae.services : []
      }));

      let clientPortalLink: string | null = null;
      let clientPortalStatus: ClientPortalStatus | null = null;

      if (portalResult.data) {
        const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        clientPortalLink = `${baseUrl}/client/${portalResult.data.access_token}`;
        
        const { data: selections } = await supabase
          .from('client_service_selections')
          .select('id, created_at')
          .eq('client_job_access_id', portalResult.data.id)
          .maybeSingle();

        clientPortalStatus = {
          accessToken: portalResult.data.access_token,
          emailSentAt: portalResult.data.email_sent_at,
          emailError: portalResult.data.email_error,
          firstAccessedAt: portalResult.data.first_accessed_at,
          passwordSetAt: portalResult.data.password_set_at,
          hasClientAccount: !!portalResult.data.client_id,
          hasServiceSelections: !!selections,
          serviceSelectionsAt: selections?.created_at || null,
        };
      }

      let serviceCompletions: { service_id: string; completed_at: string }[] = [];
      if (approvedEstimates.length > 0) {
        const estimateIds = approvedEstimates.map(e => e.id);
        const { data: completionsData } = await supabase
          .from('service_completions')
          .select('service_id, completed_at')
          .in('approved_estimate_id', estimateIds);
        serviceCompletions = completionsData || [];
      }

      const rugs = (rugsResult.data || []) as Rug[];
      const allPhotoPaths = rugs.flatMap(rug => rug.photo_urls || []);
      if (allPhotoPaths.length > 0) {
        await batchSignUrls(allPhotoPaths);
      }

      return {
        job,
        rugs,
        branding: brandingResult.data as BusinessBranding | null,
        servicePrices: allServicePrices,
        upsellServices,
        approvedEstimates,
        payments: (paymentsResult.data || []) as Payment[],
        clientPortalLink,
        clientPortalStatus,
        serviceCompletions,
      };
    },
    enabled: !!jobId && !!userId && !companyLoading,
    staleTime: 30000,
  });
};

// Hook to invalidate job detail cache
export const useInvalidateJobDetail = () => {
  const queryClient = useQueryClient();
  const { companyId } = useCompany();
  
  return (jobId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(companyId, jobId) });
  };
};
