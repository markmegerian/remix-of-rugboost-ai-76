import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { batchSignUrls } from '@/hooks/useSignedUrls';
import {
  LifecycleStatus,
  isEstimateSent,
  LIFECYCLE_ERRORS,
} from '@/lib/lifecycleStateMachine';
import type { User } from '@supabase/supabase-js';

// ── Shared types ────────────────────────────────────────────

export interface ServiceItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  priority: 'high' | 'medium' | 'low';
  adjustedTotal: number;
  pricingFactors?: string[];
}

export interface PhotoAnnotations {
  photoIndex: number;
  annotations: Array<{
    label: string;
    location: string;
    x: number;
    y: number;
  }>;
}

export interface RugData {
  id: string;
  rug_number: string;
  rug_type: string;
  length: number | null;
  width: number | null;
  photo_urls: string[] | null;
  analysis_report: string | null;
  image_annotations: PhotoAnnotations[] | null;
  estimate_id: string;
  services: ServiceItem[];
  total: number;
}

export interface JobData {
  id: string;
  job_number: string;
  client_name: string;
  status: string;
  created_at: string;
}

export interface BusinessBranding {
  business_name: string | null;
  business_phone: string | null;
  business_email: string | null;
  business_address?: string | null;
  logo_path?: string | null;
}

// ── Hook ────────────────────────────────────────────────────

interface UseClientPortalDataParams {
  accessToken: string | undefined;
  user: User | null;
  authLoading: boolean;
}

export function useClientPortalData({
  accessToken,
  user,
  authLoading,
}: UseClientPortalDataParams) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<JobData | null>(null);
  const [rugs, setRugs] = useState<RugData[]>([]);
  const [branding, setBranding] = useState<BusinessBranding | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [clientJobAccessId, setClientJobAccessId] = useState<string | null>(null);
  const [staffUserId, setStaffUserId] = useState<string | null>(null);

  // ── Password-setup branding fetch ───────────────────────
  const fetchBrandingForPasswordSetup = async () => {
    try {
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('validate_access_token', { _token: accessToken })
        .single();

      let businessName = 'Rug Cleaning';

      if (!tokenError && tokenData?.staff_user_id) {
        const { data: brandingData } = await supabase
          .from('profiles')
          .select('business_name')
          .eq('user_id', tokenData.staff_user_id)
          .single();

        if (brandingData?.business_name) {
          businessName = brandingData.business_name;
        }
      }

      navigate(
        `/client/set-password?token=${accessToken}&business=${encodeURIComponent(businessName)}`,
      );
    } catch {
      navigate(`/client/set-password?token=${accessToken}`);
    }
  };

  // ── Main data loader ────────────────────────────────────
  const checkAccessAndLoadData = async () => {
    if (!accessToken || !user) return;

    setLoading(true);
    try {
      // Validate token via secure RPC
      const { data: tokenData, error: tokenError } = await supabase
        .rpc('validate_access_token', { _token: accessToken })
        .single();

      if (tokenError || !tokenData) {
        toast.error(LIFECYCLE_ERRORS.INVALID_TOKEN);
        navigate('/');
        return;
      }

      const jobCompanyId = tokenData.company_id as string | null;

      const accessData = {
        id: tokenData.access_id as string,
        job_id: tokenData.job_id as string,
        client_id: tokenData.client_id as string | null,
        company_id: jobCompanyId,
        jobs: {
          id: tokenData.job_id as string,
          job_number: tokenData.job_number as string,
          client_name: tokenData.client_name as string,
          status: tokenData.job_status as string,
          user_id: tokenData.staff_user_id as string,
        },
      };

      const jobStatus = tokenData.job_status as LifecycleStatus;
      if (!isEstimateSent(jobStatus)) {
        toast.error('This estimate is not ready for viewing yet.');
        navigate('/');
        return;
      }

      // Link client account
      const { data: clientAccount } = await supabase
        .from('client_accounts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!clientAccount) {
        const { data: newClient, error: createError } = await supabase
          .from('client_accounts')
          .insert({
            user_id: user.id,
            email: user.email || '',
            full_name: user.user_metadata?.full_name || '',
          })
          .select('id')
          .single();

        if (createError) throw createError;

        await supabase
          .from('client_job_access')
          .update({ client_id: newClient.id })
          .eq('id', accessData.id);

        await supabase
          .from('user_roles')
          .insert({ user_id: user.id, role: 'client' })
          .select();
      } else if (!accessData.client_id) {
        await supabase
          .from('client_job_access')
          .update({ client_id: clientAccount.id })
          .eq('id', accessData.id);
      }

      // Track first access
      const { error: trackingError } = await supabase.rpc(
        'update_client_access_tracking',
        { _access_token: accessToken, _first_accessed: true, _password_set: false },
      );
      if (trackingError) console.error('Error updating access tracking:', trackingError);

      setHasAccess(true);
      setClientJobAccessId(accessData.id);
      setStaffUserId(accessData.jobs.user_id);

      // Full job data
      const { data: fullJobData } = await supabase
        .from('jobs')
        .select('id, job_number, client_name, status, created_at')
        .eq('id', accessData.job_id)
        .single();

      const jobData: JobData = fullJobData
        ? {
            id: fullJobData.id,
            job_number: fullJobData.job_number,
            client_name: fullJobData.client_name,
            status: fullJobData.status,
            created_at: fullJobData.created_at,
          }
        : { ...accessData.jobs, created_at: new Date().toISOString() };
      setJob(jobData);

      // Branding
      const { data: brandingData } = await supabase
        .from('profiles')
        .select('business_name, business_phone, business_email, business_address, logo_path')
        .eq('user_id', accessData.jobs.user_id)
        .single();

      if (brandingData) setBranding(brandingData);

      // Rugs + estimates
      const { data: rugsData, error: rugsError } = await supabase
        .from('inspections')
        .select('id, rug_number, rug_type, length, width, photo_urls, analysis_report, image_annotations')
        .eq('job_id', jobData.id);

      if (rugsError) throw rugsError;

      const { data: estimatesData, error: estimatesError } = await supabase
        .from('approved_estimates')
        .select('id, inspection_id, services, total_amount')
        .eq('job_id', jobData.id);

      if (estimatesError) throw estimatesError;

      const estimateMap = new Map<string, { id: string; services: unknown; total_amount: number }>();
      (estimatesData || []).forEach((est) => estimateMap.set(est.inspection_id, est));

      const processedRugs: RugData[] = (rugsData || [])
        .filter((r) => estimateMap.has(r.id))
        .map((r) => {
          const estimate = estimateMap.get(r.id)!;
          const rawServices = Array.isArray(estimate.services)
            ? (estimate.services as ServiceItem[])
            : [];
          const processedServices = rawServices.map((svc) => ({
            ...svc,
            adjustedTotal: svc.adjustedTotal ?? svc.quantity * svc.unitPrice,
          }));
          return {
            id: r.id,
            rug_number: r.rug_number,
            rug_type: r.rug_type,
            length: r.length,
            width: r.width,
            photo_urls: r.photo_urls,
            analysis_report: r.analysis_report,
            image_annotations: Array.isArray(r.image_annotations)
              ? (r.image_annotations as unknown as PhotoAnnotations[])
              : null,
            estimate_id: estimate.id,
            services: processedServices,
            total: estimate.total_amount,
          };
        });

      setRugs(processedRugs);

      // Preload first 3 photos per rug
      const initialPhotoPaths = processedRugs.flatMap((rug) =>
        (rug.photo_urls || []).slice(0, 3),
      );
      if (initialPhotoPaths.length > 0) await batchSignUrls(initialPhotoPaths);
    } catch (error) {
      console.error('Error loading portal data:', error);
      toast.error('Failed to load portal data');
    } finally {
      setLoading(false);
    }
  };

  // ── Effect: route based on auth state ───────────────────
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate(`/client/auth?token=${accessToken}`);
    } else if (user.user_metadata?.needs_password_setup) {
      fetchBrandingForPasswordSetup();
    } else {
      checkAccessAndLoadData();
    }
  }, [user, authLoading, accessToken]);

  return {
    loading,
    job,
    rugs,
    branding,
    hasAccess,
    clientJobAccessId,
    staffUserId,
  };
}
