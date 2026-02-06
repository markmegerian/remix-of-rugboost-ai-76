import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import { batchSignUrls } from '@/hooks/useSignedUrls';

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
  created_at: string;
  estimate_approved?: boolean;
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

// Fetch all job detail data in parallel
export const useJobDetail = (jobId: string | undefined, userId: string | undefined) => {
  return useQuery({
    queryKey: queryKeys.jobs.detail(jobId || ''),
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
      ] = await Promise.all([
        // Job details
        supabase
          .from('jobs')
          .select('*')
          .eq('id', jobId)
          .maybeSingle(),
        
        // Rugs
        supabase
          .from('inspections')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: true }),
        
        // Branding - use logo_path instead of logo_url for fresh signed URLs
        supabase
          .from('profiles')
          .select('business_name, business_address, business_phone, business_email, logo_path')
          .eq('user_id', userId)
          .maybeSingle(),
        
        // Service prices
        supabase
          .from('service_prices')
          .select('service_name, unit_price, is_additional')
          .eq('user_id', userId),
        
        // Approved estimates
        supabase
          .from('approved_estimates')
          .select('id, inspection_id, services, total_amount')
          .eq('job_id', jobId),
        
        // Payments
        supabase
          .from('payments')
          .select('*')
          .eq('job_id', jobId)
          .order('created_at', { ascending: false }),
        
        // Client portal access
        supabase
          .from('client_job_access')
          .select(`
            id,
            access_token,
            email_sent_at,
            email_error,
            first_accessed_at,
            password_set_at,
            client_id
          `)
          .eq('job_id', jobId)
          .maybeSingle(),
      ]);

      // Check for errors
      if (jobResult.error) throw jobResult.error;
      if (!jobResult.data) throw new Error('Job not found');

      // Process service prices
      const servicePrices: ServicePrice[] = (pricesResult.data || [])
        .filter(p => !p.is_additional)
        .map(p => ({ name: p.service_name, unitPrice: p.unit_price }));

      const upsellServices: UpsellService[] = (pricesResult.data || [])
        .filter(p => p.is_additional)
        .map(p => ({ name: p.service_name, unitPrice: p.unit_price }));

      // Process approved estimates
      const approvedEstimates: ApprovedEstimate[] = (estimatesResult.data || []).map(ae => ({
        ...ae,
        services: Array.isArray(ae.services) ? ae.services : []
      }));

      // Process client portal status
      let clientPortalLink: string | null = null;
      let clientPortalStatus: ClientPortalStatus | null = null;

      if (portalResult.data) {
        clientPortalLink = `${window.location.origin}/client/${portalResult.data.access_token}`;
        
        // Check for service selections
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

      // Fetch service completions
      let serviceCompletions: { service_id: string; completed_at: string }[] = [];
      if (approvedEstimates.length > 0) {
        const estimateIds = approvedEstimates.map(e => e.id);
        const { data: completionsData } = await supabase
          .from('service_completions')
          .select('service_id, completed_at')
          .in('approved_estimate_id', estimateIds);
        serviceCompletions = completionsData || [];
      }

      // Preload all photo URLs in a single batch request BEFORE returning
      // This ensures photos appear instantly when the page renders
      const rugs = (rugsResult.data || []) as Rug[];
      const allPhotoPaths = rugs.flatMap(rug => rug.photo_urls || []);
      if (allPhotoPaths.length > 0) {
        await batchSignUrls(allPhotoPaths);
      }

      return {
        job: jobResult.data as JobDetail,
        rugs,
        branding: brandingResult.data as BusinessBranding | null,
        servicePrices,
        upsellServices,
        approvedEstimates,
        payments: (paymentsResult.data || []) as Payment[],
        clientPortalLink,
        clientPortalStatus,
        serviceCompletions,
      };
    },
    enabled: !!jobId && !!userId,
    staleTime: 30000,
  });
};

// Hook to invalidate job detail cache
export const useInvalidateJobDetail = () => {
  const queryClient = useQueryClient();
  
  return (jobId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.detail(jobId) });
  };
};
